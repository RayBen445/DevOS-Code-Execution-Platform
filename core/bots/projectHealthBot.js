/**
 * Project Health Bot — audits project quality and surfaces actionable tips.
 *
 * Fires on:
 *   project.saved     → run health checks
 *   project.deployed  → run post-deploy checks
 *   project.created   → run onboarding checks
 *
 * Checks performed:
 *   ✅ Has a description
 *   ✅ Has at least one file
 *   ✅ Has a README or index file
 *   ✅ No leftover placeholder content (Lorem Ipsum, TODO, FIXME > threshold)
 *   ✅ Entry file is set for deployment
 *   ✅ No exposed secrets in code (basic patterns)
 *   ✅ Has environment variables set if plugins are installed
 *
 * Results are emitted as `project.health_report` events which the React layer
 * displays as a collapsible panel in the IDE.
 */

// ── Secret leak detector ─────────────────────────────────────────────────────

const SECRET_PATTERNS = [
  { label: "AWS Access Key",    pattern: /AKIA[0-9A-Z]{16}/g },
  { label: "Private Key block", pattern: /-----BEGIN (RSA|EC|PRIVATE) KEY-----/g },
  { label: "Stripe secret key", pattern: /sk_(live|test)_[0-9a-zA-Z]{24,}/g },
  { label: "Generic password",  pattern: /password\s*=\s*["'][^"']{8,}/gi },
  { label: "Generic API key",   pattern: /api[_-]?key\s*=\s*["'][A-Za-z0-9_\-]{20,}/gi },
];

function detectSecrets(files) {
  const found = [];
  for (const file of files) {
    if (!file.content) continue;
    for (const { label, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        found.push({ file: file.name, secret: label });
      }
    }
  }
  return found;
}

// ── Checks ───────────────────────────────────────────────────────────────────

function check(id, label, pass, tip, severity = "info") {
  return { id, label, pass, tip, severity };
}

function runHealthChecks(payload) {
  const { description, files = [], plugins = {}, entryFile, projectName } = payload;
  const results = [];

  // 1. Has description
  results.push(check(
    "has_description",
    "Project has a description",
    !!(description && description.trim().length >= 10),
    "Add a description so others understand what your project does.",
    "info"
  ));

  // 2. Has files
  results.push(check(
    "has_files",
    "Project has at least one file",
    files.length > 0,
    "Create at least one file to start building.",
    "warning"
  ));

  // 3. Has README or index
  const hasReadme = files.some(f => /readme/i.test(f.name));
  const hasIndex = files.some(f => /index\.(html|js|ts|jsx|tsx|py)/.test(f.name));
  results.push(check(
    "has_readme_or_index",
    "Has README or index file",
    hasReadme || hasIndex,
    "Add a README.md or an index file. Projects with a README get more views.",
    "info"
  ));

  // 4. No excessive placeholder content
  const placeholderThreshold = 3;
  const placeholderCount = files.filter(f =>
    f.content && (/lorem ipsum/i.test(f.content) || (f.content.match(/TODO|FIXME/g) || []).length > placeholderThreshold)
  ).length;
  results.push(check(
    "no_placeholders",
    "No leftover placeholder content",
    placeholderCount === 0,
    `${placeholderCount} file(s) still contain Lorem Ipsum or excessive TODO/FIXME comments.`,
    "info"
  ));

  // 5. Entry file set (for deployable projects with multiple files)
  if (files.length > 1) {
    results.push(check(
      "entry_file_set",
      "Entry file is configured",
      !!entryFile,
      "Set an entry file in Project Settings so your deploy works correctly.",
      "warning"
    ));
  }

  // 6. No secrets exposed
  const secrets = detectSecrets(files);
  results.push(check(
    "no_secrets",
    "No exposed secrets or credentials",
    secrets.length === 0,
    secrets.length > 0
      ? `Potential secret found in: ${secrets.map(s => `${s.file} (${s.secret})`).join(", ")}. Move secrets to Env Vars.`
      : "Keep secrets in env vars, not in code.",
    "error"
  ));

  // 7. Plugins have env vars set
  const installedPluginIds = Object.keys(plugins || {});
  const missingEnvPlugins = installedPluginIds.filter(pid => {
    const pluginRecord = plugins[pid];
    return pluginRecord?.envVars?.some(key => !payload.env?.[key]);
  });
  if (installedPluginIds.length > 0) {
    results.push(check(
      "plugin_env_set",
      "Plugin env vars are all set",
      missingEnvPlugins.length === 0,
      missingEnvPlugins.length > 0
        ? `Missing env vars for: ${missingEnvPlugins.join(", ")}. Check the Plugin panel.`
        : "All plugin env vars are configured.",
      "warning"
    ));
  }

  const passed = results.filter(r => r.pass).length;
  const score = results.length > 0 ? Math.round((passed / results.length) * 100) : 100;
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return { checks: results, score, grade, passed, total: results.length };
}

// ── Bot ──────────────────────────────────────────────────────────────────────

export const projectHealthBot = {
  name: "Project Health Bot",
  type: "system",
  events: ["project.created", "project.saved", "project.deployed"],
  permissions: {
    read: ["project"],
    write: ["health_report"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    const projectId = payload.projectId || payload.id;

    if (!projectId) return { skipped: true, reason: "no_projectId" };

    const report = runHealthChecks(payload);

    ctx.logger.info(
      `[Health Bot] Project ${projectId}: score=${report.score} grade=${report.grade} (${report.passed}/${report.total} checks passed)`
    );

    await ctx.emit("project.health_report", {
      projectId,
      triggeredBy: event,
      ...report,
      timestamp: new Date().toISOString(),
    });

    // Emit warning notification if score drops below 60
    if (report.score < 60) {
      await ctx.emit("notification.health_warning", {
        userId: payload.userId,
        title: "Project health check",
        message: `Your project scored ${report.score}/100. Check the Health panel in the IDE for tips.`,
        type: "system",
        projectId,
      });
    }

    return { projectId, score: report.score, grade: report.grade };
  },
};

export { runHealthChecks };
