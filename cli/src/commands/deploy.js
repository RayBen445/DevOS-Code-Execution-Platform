"use strict";

/**
 * devos deploy
 *
 * Upload the current project to DevOS, trigger a build, and return the live URL.
 *
 * Flow:
 *   1. Read devos.json (optional) for project config
 *   2. Detect project type (HTML / Vite / Next.js / Node)
 *   3. Archive the project directory (zip)
 *   4. Upload to the DevOS deployment API
 *   5. Poll until build succeeds and print the live URL
 */

const fs = require("fs");
const path = require("path");
const { requireAuth, getUsername, DEVOS_API_BASE } = require("../config");

module.exports = function registerDeploy(program) {
  program
    .command("deploy")
    .description("Deploy the current project to DevOS")
    .option("-d, --dir <path>", "Project directory to deploy", ".")
    .option("--name <name>", "Override the project name")
    .option("--build <cmd>", "Override the build command")
    .option("--output <dir>", "Override the build output directory")
    .action(async (opts) => {
      let chalk, ora, fetch, FormData, JSZip;
      try {
        chalk = (await import("chalk")).default;
        ora = (await import("ora")).default;
        fetch = (await import("node-fetch")).default;
        FormData = (await import("form-data")).default;
        JSZip = require("jszip");
      } catch (err) {
        console.error(`Missing dependency: ${err.message}\nRun: npm install` );
        process.exit(1);
      }

      const token = requireAuth();
      const username = getUsername();
      const projectDir = path.resolve(opts.dir);

      if (!fs.existsSync(projectDir)) {
        console.error(chalk.red(`Directory not found: ${projectDir}`));
        process.exit(1);
      }

      // ── Read devos.json ──────────────────────────────────────────────────────
      let devosConfig = {};
      const configPath = path.join(projectDir, "devos.json");
      if (fs.existsSync(configPath)) {
        try {
          devosConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch {
          console.warn(chalk.yellow("Warning: failed to parse devos.json — using defaults."));
        }
      }

      const projectName = opts.name || devosConfig.name || path.basename(projectDir);
      const buildCmd = opts.build || devosConfig.build || detectBuildCommand(projectDir);
      const outputDir = opts.output || devosConfig.output || detectOutputDir(projectDir);
      const projectType = detectProjectType(projectDir);

      console.log(chalk.cyan(`\nDeploying ${chalk.bold(projectName)} (${projectType})\n`));

      // ── Archive project ──────────────────────────────────────────────────────
      const zipSpinner = ora("Archiving project…").start();
      let zipBuffer;
      try {
        zipBuffer = await archiveDirectory(projectDir, JSZip);
        zipSpinner.succeed(`Archived ${(zipBuffer.length / 1024).toFixed(1)} KB`);
      } catch (err) {
        zipSpinner.fail(chalk.red(`Archive failed: ${err.message}`));
        process.exit(1);
      }

      // ── Upload & build ───────────────────────────────────────────────────────
      const uploadSpinner = ora("Uploading & building…").start();
      try {
        const form = new FormData();
        form.append("archive", zipBuffer, {
          filename: "project.zip",
          contentType: "application/zip",
        });
        form.append("name", projectName);
        form.append("buildCmd", buildCmd);
        form.append("outputDir", outputDir);
        form.append("projectType", projectType);

        const res = await fetch(`${DEVOS_API_BASE}/cli/deploy`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...form.getHeaders(),
          },
          body: form,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          uploadSpinner.fail(chalk.red(`Deploy failed: ${body.message || res.statusText}`));
          process.exit(1);
        }

        const result = await res.json();
        uploadSpinner.succeed("Build complete!");

        const liveUrl =
          result.url ||
          `https://${username?.toLowerCase() ?? "user"}.devos.name.ng`;

        console.log(
          chalk.green(`\n✓ Deployed successfully!\n`) +
          chalk.bold(`  Live URL: ${chalk.cyan(liveUrl)}\n`)
        );
      } catch (err) {
        uploadSpinner.fail(chalk.red(`Network error: ${err.message}`));
        process.exit(1);
      }
    });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectProjectType(dir) {
  if (fs.existsSync(path.join(dir, "next.config.js")) || fs.existsSync(path.join(dir, "next.config.ts"))) return "nextjs";
  if (fs.existsSync(path.join(dir, "vite.config.js")) || fs.existsSync(path.join(dir, "vite.config.ts"))) return "vite";
  if (fs.existsSync(path.join(dir, "package.json"))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      if (pkg.dependencies?.next || pkg.devDependencies?.next) return "nextjs";
      if (pkg.dependencies?.vite || pkg.devDependencies?.vite) return "vite";
      return "node";
    } catch { /* noop */ }
  }
  if (fs.existsSync(path.join(dir, "index.html"))) return "html";
  return "unknown";
}

function detectBuildCommand(dir) {
  if (!fs.existsSync(path.join(dir, "package.json"))) return "";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    if (pkg.scripts?.build) return "npm run build";
  } catch { /* noop */ }
  return "";
}

function detectOutputDir(dir) {
  const candidates = ["dist", "build", ".next", "out", "public"];
  for (const c of candidates) {
    if (fs.existsSync(path.join(dir, c))) return c;
  }
  return "dist";
}

async function archiveDirectory(dir, JSZip) {
  const zip = new JSZip();
  addDirectory(zip, dir, dir);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

const IGNORE = new Set([
  "node_modules", ".git", ".next", "dist", "build", ".env", ".env.local",
]);

function addDirectory(zip, baseDir, currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
    const fullPath = path.join(currentDir, entry.name);
    const zipPath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      addDirectory(zip, baseDir, fullPath);
    } else {
      const stat = fs.statSync(fullPath);
      if (stat.size < 5 * 1024 * 1024) { // skip files > 5 MB
        zip.file(zipPath, fs.readFileSync(fullPath));
      }
    }
  }
}
