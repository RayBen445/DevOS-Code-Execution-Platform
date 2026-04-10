/**
 * Deployment Diff Service
 *
 * Tracks file hashes from the previous deployment and computes a diff
 * so that only changed/added files are re-deployed and deleted files
 * are removed — reducing bandwidth and deploy time.
 *
 * Snapshot storage: `deployment_files/{projectId}` (one doc per project)
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { DeployDiffResult, DeploymentSnapshot, FileData } from "../types";

const COLL = "deployment_files";

// ---------------------------------------------------------------------------
// Per-file hashing
// ---------------------------------------------------------------------------

/**
 * Compute a lightweight hash of a single file's content.
 * Uses SHA-256 via Web Crypto — returns a hex string.
 */
export async function hashFileContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Build a `Record<path, hash>` map for all files in the project.
 */
export async function buildFileHashMap(
  files: FileData[]
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    files.map(async (f) => {
      const path = (f.path || f.name).replace(/^\/+/, "");
      const hash = await hashFileContent(f.content ?? "");
      return [path, hash] as [string, string];
    })
  );
  return Object.fromEntries(entries);
}

// ---------------------------------------------------------------------------
// Snapshot read / write
// ---------------------------------------------------------------------------

/** Load the previous deployment snapshot for a project. */
export async function getDeploymentSnapshot(
  projectId: string
): Promise<DeploymentSnapshot | null> {
  try {
    const snap = await getDoc(doc(db, COLL, projectId));
    if (!snap.exists()) return null;
    return snap.data() as DeploymentSnapshot;
  } catch {
    return null;
  }
}

/** Persist the current file hash map as the new deployment snapshot. */
export async function saveDeploymentSnapshot(
  projectId: string,
  fileHashes: Record<string, string>
): Promise<void> {
  try {
    await setDoc(doc(db, COLL, projectId), {
      projectId,
      fileHashes,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-critical — swallow silently
  }
}

// ---------------------------------------------------------------------------
// Diffing
// ---------------------------------------------------------------------------

/**
 * Compare current file hashes against the last deployment snapshot
 * and return a categorised diff.
 *
 * @param currentHashes  Hash map built from the files about to be deployed.
 * @param snapshot       Previous deployment snapshot (null = first deploy).
 */
export function diffDeployment(
  currentHashes: Record<string, string>,
  snapshot: DeploymentSnapshot | null
): DeployDiffResult {
  const prevHashes = snapshot?.fileHashes ?? {};

  const currentPaths = new Set(Object.keys(currentHashes));
  const prevPaths = new Set(Object.keys(prevHashes));

  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const unchanged: string[] = [];

  for (const path of currentPaths) {
    if (!prevPaths.has(path)) {
      added.push(path);
    } else if (currentHashes[path] !== prevHashes[path]) {
      modified.push(path);
    } else {
      unchanged.push(path);
    }
  }

  for (const path of prevPaths) {
    if (!currentPaths.has(path)) {
      deleted.push(path);
    }
  }

  return {
    added,
    modified,
    deleted,
    unchanged,
    isIdentical: added.length === 0 && modified.length === 0 && deleted.length === 0,
  };
}

/**
 * Filter a file list to only those files that need to be (re-)deployed.
 * If `diff.isIdentical` is true the caller can skip the deploy entirely.
 */
export function getFilesToDeploy(
  files: FileData[],
  diff: DeployDiffResult
): FileData[] {
  const changedPaths = new Set([...diff.added, ...diff.modified]);
  return files.filter((f) => {
    const p = (f.path || f.name).replace(/^\/+/, "");
    return changedPaths.has(p);
  });
}
