/**
 * Execution Detection Service
 *
 * Analyses a project's file list to determine:
 *   - Framework (Next.js, React, Vue, Vite, Node.js, Static, Unknown)
 *   - Build / dev / start commands (from package.json scripts)
 *   - Output directory (dist, build, .next, out, public)
 *
 * All detection is pure (no network calls).
 */

import { FileData } from "../types";
import { DetectedFramework, DetectionResult } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalise(path: string): string {
  return path.replace(/^\/+/, "").toLowerCase();
}

function findFile(files: FileData[], ...names: string[]): FileData | undefined {
  const set = new Set(names.map((n) => n.toLowerCase()));
  return files.find((f) => {
    const base = normalise(f.path || f.name)
      .split("/")
      .pop()!;
    return set.has(base);
  });
}

function hasPath(files: FileData[], segment: string): boolean {
  const seg = segment.toLowerCase().replace(/^\/+/, "");
  return files.some((f) => normalise(f.path || f.name).startsWith(seg));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Detect project type, framework, commands, and output directory.
 *
 * @param files  All files in the project (from Firestore).
 * @returns      A fully-populated DetectionResult.
 */
export function detectProject(files: FileData[]): DetectionResult {
  const pkgFile = findFile(files, "package.json");
  const hasPackageJson = !!pkgFile;

  // ── Parse package.json ────────────────────────────────────────────────────
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};
  let scripts: Record<string, string> = {};

  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content ?? "{}");
      deps = pkg.dependencies ?? {};
      devDeps = pkg.devDependencies ?? {};
      scripts = pkg.scripts ?? {};
    } catch {
      // Malformed package.json — fall through with defaults
    }
  }

  const allDeps = { ...deps, ...devDeps };

  // ── Framework detection ───────────────────────────────────────────────────
  let framework: DetectedFramework = "Unknown";

  if (hasPackageJson) {
    if ("next" in allDeps) {
      framework = "Next.js";
    } else if ("vite" in allDeps) {
      framework = "Vite";
    } else if ("vue" in allDeps || "@vue/core" in allDeps) {
      framework = "Vue";
    } else if ("react" in allDeps || "react-dom" in allDeps) {
      framework = "React";
    } else {
      framework = "Node.js";
    }
  } else {
    // No package.json — check for static site indicators
    const hasIndexHtmlRoot = files.some(
      (f) => normalise(f.path || f.name) === "index.html"
    );
    const hasIndexHtmlPublic = files.some(
      (f) => normalise(f.path || f.name) === "public/index.html"
    );
    if (hasIndexHtmlRoot || hasIndexHtmlPublic) {
      framework = "Static";
    }
  }

  // ── Structure-based refinements ───────────────────────────────────────────
  if (framework === "Unknown" || framework === "Node.js") {
    if (hasPath(files, "pages/") || hasPath(files, "app/")) {
      // Could be Next.js without being listed in deps
      if (hasPackageJson) framework = "Next.js";
    }
  }

  // ── Build / dev / start commands ─────────────────────────────────────────
  const buildCommand: string | null =
    scripts.build
      ? `npm run build`
      : framework === "Next.js"
        ? "npm run build"
        : framework === "Vite"
          ? "npm run build"
          : framework === "Vue"
            ? "npm run build"
            : null;

  const devCommand: string | null =
    scripts.dev
      ? "npm run dev"
      : scripts.start
        ? "npm run start"
        : framework === "Node.js"
          ? "node server.js"
          : null;

  const startCommand: string | null =
    scripts.start ? "npm run start" : framework === "Node.js" ? "node server.js" : null;

  // ── Output directory ─────────────────────────────────────────────────────
  let outputDir: string | null = null;
  if (framework === "Next.js") outputDir = ".next";
  else if (framework === "Vite" || framework === "React") outputDir = "dist";
  else if (framework === "Vue") outputDir = "dist";
  else if (framework === "Node.js") outputDir = null;

  // Honour explicit vite.config output if detectable
  const viteConfig = findFile(files, "vite.config.ts", "vite.config.js");
  if (viteConfig) {
    const match = viteConfig.content?.match(/outDir\s*:\s*['"]([^'"]+)['"]/);
    if (match) outputDir = match[1];
  }

  // ── Static site index check ───────────────────────────────────────────────
  const hasIndexHtml =
    files.some((f) => normalise(f.path || f.name) === "index.html") ||
    files.some((f) => normalise(f.path || f.name) === "public/index.html");

  if (!hasPackageJson && hasIndexHtml) {
    framework = "Static";
  }

  return {
    framework,
    buildCommand,
    devCommand,
    startCommand,
    outputDir,
    hasPackageJson,
    hasIndexHtml,
  };
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Tailwind colour classes for the framework badge */
export const FRAMEWORK_BADGE_COLORS: Record<DetectedFramework, string> = {
  "Next.js": "bg-white/10 text-white border-border-base",
  React: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Vue: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Vite: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "Node.js": "bg-green-500/15 text-green-400 border-green-500/30",
  Static: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
