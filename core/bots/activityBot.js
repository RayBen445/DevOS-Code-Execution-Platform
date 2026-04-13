/**
 * Activity Bot — records timeline events on projects and user profiles.
 *
 * Fires on:
 *   project.created     → log "Project created" activity
 *   project.saved       → log "Files updated" activity (debounced by version hash)
 *   deploy.triggered    → log "Deployed to <url>" activity
 *   deploy.success      → update project status, log success
 *   deploy.failed       → log failure with error
 *   commit.created      → log "Committed: <message>" activity
 *   branch.created      → log "Created branch <name>" activity
 *   pr.opened           → log "Opened PR: <title>" activity
 *   pr.merged           → log "Merged PR: <title>" activity
 *   plugin.installed    → log "Installed plugin: <name>" activity
 *   plugin.uninstalled  → log "Uninstalled plugin: <name>" activity
 */

const MAX_ACTIVITY_ENTRIES = 500;

// In-memory activity store — the React layer writes to Firestore separately.
// This gives bots a fast in-process view of recent activity.
const activityStore = new Map(); // projectId → activity[]

function ensureProjectStore(projectId) {
  if (!activityStore.has(projectId)) activityStore.set(projectId, []);
  return activityStore.get(projectId);
}

function addActivity(projectId, entry) {
  const store = ensureProjectStore(projectId);
  store.unshift(entry);
  if (store.length > MAX_ACTIVITY_ENTRIES) store.length = MAX_ACTIVITY_ENTRIES;
  return entry;
}

function buildEntry(event, payload) {
  const ts = new Date().toISOString();
  switch (event) {
    case "project.created":
      return { type: "project_created", message: `Project "${payload.projectName}" created`, userId: payload.userId, timestamp: ts };
    case "project.saved":
      return { type: "files_updated", message: `Files updated${payload.fileCount ? ` (${payload.fileCount} file${payload.fileCount !== 1 ? "s" : ""})` : ""}`, userId: payload.userId, timestamp: ts };
    case "deploy.triggered":
      return { type: "deploy_triggered", message: "Deploy triggered", userId: payload.userId, timestamp: ts };
    case "deploy.success":
      return { type: "deploy_success", message: `Deployed to ${payload.deployUrl || "production"}`, userId: payload.userId, deployUrl: payload.deployUrl, timestamp: ts };
    case "deploy.failed":
      return { type: "deploy_failed", message: `Deploy failed: ${payload.error || "unknown error"}`, userId: payload.userId, timestamp: ts };
    case "commit.created":
      return { type: "commit", message: `Committed: "${payload.message}"`, userId: payload.userId, commitId: payload.commitId, timestamp: ts };
    case "branch.created":
      return { type: "branch_created", message: `Created branch "${payload.branchName}" from ${payload.baseBranch || "main"}`, userId: payload.userId, timestamp: ts };
    case "pr.opened":
      return { type: "pr_opened", message: `Opened PR: "${payload.title}"`, userId: payload.userId, prId: payload.prId, timestamp: ts };
    case "pr.merged":
      return { type: "pr_merged", message: `Merged PR: "${payload.title}" → ${payload.targetBranch || "main"}`, userId: payload.userId, prId: payload.prId, timestamp: ts };
    case "plugin.installed":
      return { type: "plugin_installed", message: `Installed plugin: ${payload.pluginName}`, userId: payload.userId, pluginId: payload.pluginId, timestamp: ts };
    case "plugin.uninstalled":
      return { type: "plugin_uninstalled", message: `Uninstalled plugin: ${payload.pluginName}`, userId: payload.userId, pluginId: payload.pluginId, timestamp: ts };
    default:
      return { type: event, message: event, userId: payload.userId, timestamp: ts };
  }
}

export const activityBot = {
  name: "Activity Bot",
  type: "system",
  events: [
    "project.created",
    "project.saved",
    "deploy.triggered",
    "deploy.success",
    "deploy.failed",
    "commit.created",
    "branch.created",
    "pr.opened",
    "pr.merged",
    "plugin.installed",
    "plugin.uninstalled",
  ],
  permissions: {
    read: ["project", "user"],
    write: ["activity"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    const projectId = payload.projectId || payload.id;

    if (!projectId) {
      ctx.logger.info(`Activity Bot: no projectId for event ${event}, skipping`);
      return { skipped: true, reason: "no_project_id" };
    }

    const entry = buildEntry(event, payload);
    addActivity(projectId, entry);

    ctx.logger.info(`Activity logged: [${projectId}] ${entry.message}`);

    // Downstream: emit an activity.logged event so the React layer can write to Firestore
    await ctx.emit("activity.logged", {
      projectId,
      entry,
    });

    return { logged: true, projectId, entry };
  },
};

export function getProjectActivity(projectId) {
  return activityStore.get(projectId) || [];
}
