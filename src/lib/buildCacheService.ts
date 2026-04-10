/**
 * Build Cache Service
 *
 * Avoids unnecessary rebuilds by hashing all source files and checking
 * whether a cached build output already exists in Firestore.
 *
 * Cache storage: `build_cache/{hash}` (hash is the document ID for O(1) lookup)
 *
 * Flow:
 *   1. hashFiles(files) → SHA-256 hex string
 *   2. getCachedBuild(hash) → BuildCache | null
 *   3. If null → run build, then saveBuildCache(...)
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { BuildCache, DetectedFramework, FileData } from "../types";

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Generate a SHA-256 hex digest from all project files.
 * Files are sorted by path so the hash is stable regardless of insertion order.
 * Uses the Web Crypto API (available in all modern browsers).
 */
export async function hashFiles(files: FileData[]): Promise<string> {
  // Sort by path for determinism
  const sorted = [...files].sort((a, b) =>
    (a.path || a.name).localeCompare(b.path || b.name)
  );

  // Build a canonical string: "path\ncontent\n" repeated for each file
  const canonical = sorted
    .map((f) => `${f.path || f.name}\n${f.content ?? ""}`)
    .join("\x00");

  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * A short (8-char) version of the full hash — used as a human-readable
 * commit-like identifier in preview URLs.
 */
export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Firestore helpers
// ---------------------------------------------------------------------------

const COLL = "build_cache";

/** Check whether a cached build exists for the given hash. */
export async function getCachedBuild(hash: string): Promise<BuildCache | null> {
  try {
    const snap = await getDoc(doc(db, COLL, hash));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as BuildCache;
  } catch {
    return null;
  }
}

/** Store a successful build result in the cache. Fire-and-forget. */
export async function saveBuildCache(
  hash: string,
  projectId: string,
  framework: DetectedFramework,
  outputDir: string | null,
  outputFiles: Array<{ path: string; content: string }>
): Promise<void> {
  try {
    // Cap total cached payload to ~800 KB to stay within Firestore document limits
    const MAX_TOTAL_BYTES = 800_000;
    let totalBytes = 0;
    const cappedFiles: Array<{ path: string; content: string }> = [];
    for (const f of outputFiles) {
      const size = f.content.length;
      if (totalBytes + size > MAX_TOTAL_BYTES) break;
      cappedFiles.push(f);
      totalBytes += size;
    }

    await setDoc(doc(db, COLL, hash), {
      projectId,
      hash,
      framework,
      outputDir,
      outputFiles: cappedFiles,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-critical — ignore cache write failures
  }
}
