/**
 * Build Queue Service
 *
 * Manages a Firestore-backed build job queue for DevOS projects.
 *
 * Collection: `build_jobs/{jobId}`
 *
 * Typical flow:
 *   1. enqueueJob(...)       → creates a job with status="queued"
 *   2. Server picks it up via /api/build-job, marks status="running"
 *   3. On completion: status="success" | "failed", sets previewUrl
 *   4. subscribeBuildJob(...)  → UI reacts in real-time
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  BuildJob,
  BuildJobPriority,
  BuildJobStatus,
  DetectedFramework,
} from "../types";

const COLL = "build_jobs";

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * Add a new job to the build queue and return its document ID.
 */
export async function enqueueJob(params: {
  projectId: string;
  userId: string;
  commitHash: string;
  framework?: DetectedFramework;
  buildCommand?: string | null;
  outputDir?: string | null;
  priority?: BuildJobPriority;
}): Promise<string> {
  const ref = await addDoc(collection(db, COLL), {
    projectId: params.projectId,
    userId: params.userId,
    commitHash: params.commitHash,
    status: "queued" as BuildJobStatus,
    priority: params.priority ?? "normal",
    framework: params.framework ?? "Unknown",
    buildCommand: params.buildCommand ?? null,
    outputDir: params.outputDir ?? null,
    previewUrl: null,
    logs: [],
    error: null,
    createdAt: serverTimestamp(),
    startedAt: null,
    finishedAt: null,
  });
  return ref.id;
}

/**
 * Mark a job as started (called by the server worker).
 */
export async function markJobRunning(jobId: string): Promise<void> {
  await updateDoc(doc(db, COLL, jobId), {
    status: "running" as BuildJobStatus,
    startedAt: serverTimestamp(),
  });
}

/**
 * Mark a job as successfully completed.
 */
export async function markJobSuccess(
  jobId: string,
  previewUrl: string,
  logs: string[]
): Promise<void> {
  await updateDoc(doc(db, COLL, jobId), {
    status: "success" as BuildJobStatus,
    previewUrl,
    logs,
    finishedAt: serverTimestamp(),
    error: null,
  });
}

/**
 * Mark a job as failed.
 */
export async function markJobFailed(
  jobId: string,
  error: string,
  logs: string[]
): Promise<void> {
  await updateDoc(doc(db, COLL, jobId), {
    status: "failed" as BuildJobStatus,
    error,
    logs,
    finishedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/** Fetch a single build job by ID. */
export async function getBuildJob(jobId: string): Promise<BuildJob | null> {
  const snap = await getDoc(doc(db, COLL, jobId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as BuildJob;
}

/**
 * Subscribe to real-time updates for a single build job.
 * Returns an unsubscribe function.
 */
export function subscribeBuildJob(
  jobId: string,
  callback: (job: BuildJob | null) => void
): () => void {
  return onSnapshot(doc(db, COLL, jobId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as BuildJob) : null);
  });
}

/**
 * Subscribe to all build jobs for a project (latest 10, newest first).
 * Useful for showing a build history panel.
 */
export function subscribeProjectBuildJobs(
  projectId: string,
  callback: (jobs: BuildJob[]) => void
): () => void {
  const q = query(
    collection(db, COLL),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BuildJob)));
  });
}

/**
 * Fetch the most recent *successful* build job for a project.
 */
export async function getLatestSuccessfulJob(
  projectId: string
): Promise<BuildJob | null> {
  const q = query(
    collection(db, COLL),
    where("projectId", "==", projectId),
    where("status", "==", "success"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as BuildJob;
}

// ---------------------------------------------------------------------------
// Preview URL helpers
// ---------------------------------------------------------------------------

/**
 * Generate a per-commit preview URL.
 * Format: `<origin>/@<username>/<projectSlug>-<shortHash>`
 *
 * Falls back to the standard deploy URL when slug is unavailable.
 */
export function buildPreviewUrl(
  origin: string,
  username: string,
  projectSlug: string,
  commitHash: string
): string {
  const short = commitHash.slice(0, 8);
  return `${origin}/@${username}/${projectSlug}-${short}`;
}
