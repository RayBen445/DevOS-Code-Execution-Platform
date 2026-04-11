/**
 * Project Validation Service
 *
 * Detects TypeScript / Vite projects and runs pre-flight checks via
 * the /api/validate-project server endpoint.
 *
 * Returns a structured ValidationResult with parsed errors, each
 * carrying file + line + column + message so the IDE can highlight
 * the source location and let users click-to-jump.
 *
 * Cache: if the file hash has not changed since the last run, the
 * cached result is returned immediately (no server round-trip).
 */

import { FileData, ValidationError, ValidationResult } from "../types";
import { auth } from "./firebase";
import { hashFiles } from "./buildCacheService";

// ---------------------------------------------------------------------------
// Detection helpers (client-side, no server needed)
// ---------------------------------------------------------------------------

export interface ProjectValidationProfile {
  hasTypeScript: boolean;
  hasVite: boolean;
  hasBuildScript: boolean;
}

export function detectValidationProfile(files: FileData[]): ProjectValidationProfile {
  const nameSet = new Set(
    files.map((f) => (f.path || f.name).replace(/^\/+/, "").toLowerCase())
  );

  const hasTypeScript =
    nameSet.has("tsconfig.json") ||
    files.some((f) => {
      const n = (f.path || f.name).toLowerCase();
      return n.endsWith(".ts") || n.endsWith(".tsx");
    });

  // Detect Vite from package.json deps/scripts
  let hasVite = false;
  let hasBuildScript = false;
  const pkgFile = files.find((f) =>
    (f.path || f.name).replace(/^\/+/, "").toLowerCase() === "package.json"
  );
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content ?? "{}");
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      hasVite = "vite" in deps || pkg.scripts?.dev?.includes("vite");
      hasBuildScript = !!pkg.scripts?.build;
    } catch {
      // Malformed package.json — ignore
    }
  }

  return { hasTypeScript, hasVite, hasBuildScript };
}

// ---------------------------------------------------------------------------
// Output parsers
// ---------------------------------------------------------------------------

const TSC_ERROR_RE =
  /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/m;

/**
 * Parse `tsc --noEmit` output into structured ValidationError objects.
 */
export function parseTscOutput(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const line of output.split("\n")) {
    const m = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/);
    if (m) {
      errors.push({
        file: m[1].replace(/\\/g, "/"),
        line: parseInt(m[2], 10),
        col: parseInt(m[3], 10),
        message: m[5].trim(),
        severity: m[4] as "error" | "warning",
      });
    }
  }
  return errors;
}

/**
 * Parse Vite build output into structured ValidationError objects.
 */
export function parseViteOutput(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  // Vite error format: [vite:css] or "Plugin vite:..." or "error during build"
  const lines = output.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // "src/foo.ts:12:5: error: ..."
    const locationMatch = line.match(/^([^:]+\.(?:ts|tsx|js|jsx|css|vue)):(\d+):(\d+):/);
    if (locationMatch) {
      const msg = line.slice(locationMatch[0].length).replace(/^\s*error:\s*/i, "").trim();
      errors.push({
        file: locationMatch[1].replace(/\\/g, "/"),
        line: parseInt(locationMatch[2], 10),
        col: parseInt(locationMatch[3], 10),
        message: msg || lines[i + 1]?.trim() || "Build error",
        severity: "error",
      });
    } else if (/error during build/i.test(line) || /\[vite\].*(error|failed)/i.test(line)) {
      errors.push({
        file: "vite",
        line: 0,
        col: 0,
        message: line.trim(),
        severity: "error",
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// In-memory result cache (keyed by project hash)
// ---------------------------------------------------------------------------

const resultCache = new Map<string, ValidationResult>();

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Run validation for a project via the /api/validate-project server endpoint.
 *
 * @param files      All project files
 * @param projectId  Used for audit logging
 * @param lastHash   Hash from a previous run — if the files haven't changed,
 *                   the cached result is returned immediately.
 */
export async function validateProject(
  files: FileData[],
  projectId: string,
  lastHash?: string | null
): Promise<ValidationResult & { hash: string }> {
  const profile = detectValidationProfile(files);

  // Nothing to check
  if (!profile.hasTypeScript && !profile.hasVite) {
    return {
      status: "skipped",
      errors: [],
      hash: "",
    };
  }

  // Compute current file hash
  const hash = await hashFiles(files);

  // Cache hit — no changes since last run
  if (lastHash === hash && resultCache.has(hash)) {
    return { ...resultCache.get(hash)!, hash };
  }

  const idToken = await auth.currentUser?.getIdToken();
  const startedAt = Date.now();

  const response = await fetch("/api/validate-project", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({
      projectId,
      files: files.map((f) => ({
        name: (f.path || f.name || "").replace(/^\/+/, ""),
        content: f.content ?? "",
      })),
      checks: [
        ...(profile.hasTypeScript ? ["typescript"] : []),
        ...(profile.hasVite || profile.hasBuildScript ? ["vite"] : []),
      ],
    }),
  });

  const data = await response.json();
  const result: ValidationResult = {
    status: data.status ?? (response.ok ? "success" : "error"),
    errors: data.errors ?? [],
    rawOutput: data.rawOutput ?? "",
    durationMs: Date.now() - startedAt,
  };

  resultCache.set(hash, result);
  return { ...result, hash };
}
