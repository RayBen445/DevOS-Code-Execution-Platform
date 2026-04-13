/**
 * Search Index Bot — keeps an in-process search index in sync with project events.
 *
 * In production, this bot emits `search.index_updated` events which the server
 * uses to update the Algolia / Typesense / Firestore search index.
 * In the browser bundle (sandboxed core engine), it maintains a lightweight
 * in-memory inverted index for instant local search.
 *
 * Fires on:
 *   project.created     → index new project
 *   project.saved       → update project index
 *   project.deployed    → update deploy URL and status in index
 *   project.deleted     → remove project from index
 *   template.published  → index new template
 */

// ── In-memory inverted index ─────────────────────────────────────────────────

const projectIndex = new Map();   // projectId → indexed record
const tokenIndex   = new Map();   // token → Set<projectId>

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function indexProject(record) {
  const { id, name, description, language, ownerUsername, tags } = record;
  projectIndex.set(id, record);

  const tokens = [
    ...tokenize(name),
    ...tokenize(description),
    ...tokenize(ownerUsername),
    ...(Array.isArray(tags) ? tags.flatMap((t) => tokenize(t)) : []),
    ...(language ? [language.toLowerCase()] : []),
  ];

  // Remove old tokens for this project
  for (const [token, ids] of tokenIndex.entries()) {
    ids.delete(id);
    if (ids.size === 0) tokenIndex.delete(token);
  }

  // Add new tokens
  for (const token of tokens) {
    if (!tokenIndex.has(token)) tokenIndex.set(token, new Set());
    tokenIndex.get(token).add(id);
  }
}

function removeProject(id) {
  projectIndex.delete(id);
  for (const [token, ids] of tokenIndex.entries()) {
    ids.delete(id);
    if (ids.size === 0) tokenIndex.delete(token);
  }
}

// ── Bot ──────────────────────────────────────────────────────────────────────

export const searchIndexBot = {
  name: "Search Index Bot",
  type: "system",
  events: [
    "project.created",
    "project.saved",
    "project.deployed",
    "project.deleted",
    "template.published",
  ],
  permissions: {
    read: ["project"],
    write: ["search"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;

    if (event === "project.deleted") {
      removeProject(payload.projectId || payload.id);
      ctx.logger.info(`[Search Index Bot] Removed: ${payload.projectId}`);
      await ctx.emit("search.index_updated", {
        action: "delete",
        projectId: payload.projectId || payload.id,
      });
      return { action: "delete", projectId: payload.projectId };
    }

    const record = {
      id: payload.projectId || payload.id,
      name: payload.projectName || payload.name || "",
      description: payload.description || "",
      language: payload.language || "",
      ownerUsername: payload.ownerUsername || "",
      ownerUserId: payload.userId || "",
      tags: payload.tags || [],
      isPublic: payload.isPublic ?? true,
      deployUrl: payload.deployUrl || null,
      updatedAt: new Date().toISOString(),
      type: event === "template.published" ? "template" : "project",
    };

    if (!record.id) {
      ctx.logger.info("[Search Index Bot] Skipping: no id in payload");
      return { skipped: true };
    }

    indexProject(record);
    ctx.logger.info(`[Search Index Bot] Indexed: ${record.id} (${record.name})`);

    await ctx.emit("search.index_updated", {
      action: event === "project.created" || event === "template.published" ? "add" : "update",
      record,
    });

    return { action: "upsert", id: record.id, name: record.name };
  },
};

// ── Public search API (used by the React layer for client-side search) ───────

export function searchProjects(query, { limit = 20 } = {}) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return Array.from(projectIndex.values()).slice(0, limit);
  }

  const scores = new Map(); // projectId → hit count
  for (const token of tokens) {
    for (const [indexToken, ids] of tokenIndex.entries()) {
      if (indexToken.startsWith(token)) {
        for (const id of ids) {
          scores.set(id, (scores.get(id) || 0) + 1);
        }
      }
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => projectIndex.get(id))
    .filter(Boolean);
}

export function getIndexedCount() {
  return projectIndex.size;
}
