/**
 * Rollback & Branch Deployment Service
 *
 * Instant rollback works via a pointer swap:
 *   project.activeDeploymentId = <previousDeploymentId>
 *
 * No rebuild required — the live URL always serves whichever deployment
 * is pointed to by activeDeploymentId.
 *
 * Branch deployments each get their own Deployment record and URL.
 * Promoting a branch to production simply updates activeDeploymentId.
 *
 * Collections used:
 *   deployments/{id}
 *   projects/{id}  (activeDeploymentId field)
 */

import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Deployment } from "../types";
import { logAudit } from "./auditService";

// ---------------------------------------------------------------------------
// Deployment CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new deployment record (status = "building").
 * Returns the new document ID.
 */
export async function createBranchDeployment(params: {
  projectId: string;
  userId: string;
  username: string;
  branch: string;
  commitHash: string;
  url: string;
  previewUrl?: string;
  buildCommand?: string;
  outputDir?: string;
  framework?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "deployments"), {
    projectId: params.projectId,
    userId: params.userId,
    username: params.username,
    branch: params.branch,
    commitHash: params.commitHash,
    url: params.url,
    previewUrl: params.previewUrl ?? null,
    status: "building",
    isActive: false,
    buildCommand: params.buildCommand ?? null,
    outputDir: params.outputDir ?? null,
    framework: params.framework ?? null,
    createdAt: serverTimestamp(),
    completedAt: null,
    error: null,
  });
  return ref.id;
}

/**
 * Mark a deployment as ready and make it the active deployment for the project.
 * Also updates project.deployUrl / project.liveUrl to the new live URL.
 */
export async function activateDeployment(
  deploymentId: string,
  projectId: string,
  url: string
): Promise<void> {
  const batch = writeBatch(db);

  // Mark new deployment as active + ready
  batch.update(doc(db, "deployments", deploymentId), {
    status: "ready",
    isActive: true,
    completedAt: serverTimestamp(),
  });

  // Update the project pointer
  batch.update(doc(db, "projects", projectId), {
    activeDeploymentId: deploymentId,
    deployUrl: url,
    liveUrl: url,
    deployStatus: "success",
    lastDeployedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Mark a deployment as failed.
 */
export async function failDeployment(
  deploymentId: string,
  projectId: string,
  error: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "deployments", deploymentId), {
    status: "failed",
    isActive: false,
    error,
    completedAt: serverTimestamp(),
  });
  batch.update(doc(db, "projects", projectId), {
    deployStatus: "failed",
    deployError: error,
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

/**
 * Instantly roll back to a previous successful deployment.
 *
 * Steps:
 *   1. Verify the target deployment exists and is "ready"
 *   2. Deactivate the current active deployment
 *   3. Activate the target deployment (pointer swap on project doc)
 *   4. Append an audit log entry
 *
 * @returns the URL of the deployment that is now live.
 */
export async function rollbackToDeployment(
  projectId: string,
  targetDeploymentId: string,
  userId: string
): Promise<string> {
  // Load target deployment
  const targetSnap = await getDoc(doc(db, "deployments", targetDeploymentId));
  if (!targetSnap.exists()) throw new Error("Deployment not found");

  const target = { id: targetSnap.id, ...targetSnap.data() } as Deployment;
  if (target.status !== "ready") throw new Error("Target deployment is not in a ready state");

  // Load current active deployment ID for the audit log
  const projectSnap = await getDoc(doc(db, "projects", projectId));
  const fromDeploymentId: string | null = projectSnap.exists()
    ? projectSnap.data().activeDeploymentId ?? null
    : null;

  const batch = writeBatch(db);

  // Deactivate old active deployment if different
  if (fromDeploymentId && fromDeploymentId !== targetDeploymentId) {
    batch.update(doc(db, "deployments", fromDeploymentId), { isActive: false });
  }

  // Activate target
  batch.update(doc(db, "deployments", targetDeploymentId), { isActive: true });

  // Update project pointer
  batch.update(doc(db, "projects", projectId), {
    activeDeploymentId: targetDeploymentId,
    deployUrl: target.url,
    liveUrl: target.url,
    deployStatus: "success",
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  // Audit log (fire-and-forget)
  logAudit({
    userId,
    action: "rollback_triggered",
    projectId,
    metadata: {
      fromDeploymentId,
      toDeploymentId: targetDeploymentId,
      toUrl: target.url,
      branch: target.branch ?? "main",
      commitHash: target.commitHash ?? null,
    },
  });

  return target.url;
}

// ---------------------------------------------------------------------------
// Promote branch to production
// ---------------------------------------------------------------------------

/**
 * Promote a branch deployment to production by making it the active pointer.
 * Equivalent to rollback but semantically a forward-promotion.
 */
export async function promoteToProduction(
  projectId: string,
  deploymentId: string,
  userId: string
): Promise<string> {
  const snap = await getDoc(doc(db, "deployments", deploymentId));
  if (!snap.exists()) throw new Error("Deployment not found");
  const deployment = { id: snap.id, ...snap.data() } as Deployment;
  if (deployment.status !== "ready") throw new Error("Only ready deployments can be promoted");

  // Reuse rollback logic (it's the same pointer-swap)
  const url = await rollbackToDeployment(projectId, deploymentId, userId);

  logAudit({
    userId,
    action: "deployment_promoted",
    projectId,
    metadata: {
      deploymentId,
      branch: deployment.branch ?? "main",
      url,
    },
  });

  return url;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch all deployments for a project, newest first (up to 20).
 * Optionally filter by branch.
 */
export async function getProjectDeployments(
  projectId: string,
  branch?: string
): Promise<Deployment[]> {
  const constraints: any[] = [
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(20),
  ];
  if (branch) constraints.splice(1, 0, where("branch", "==", branch));

  const snap = await getDocs(query(collection(db, "deployments"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deployment));
}

/**
 * Subscribe to real-time deployment list for a project.
 */
export function subscribeProjectDeployments(
  projectId: string,
  callback: (deployments: Deployment[]) => void
): () => void {
  const q = query(
    collection(db, "deployments"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deployment)));
  });
}

/**
 * Build the branch-based deployment URL.
 * Format: `<origin>/@<username>/<branch>-<projectId>`
 * Falls back to the standard slug URL for "main"/"production".
 */
export function buildBranchUrl(
  origin: string,
  username: string,
  projectSlug: string,
  branch: string
): string {
  if (branch === "main" || branch === "production" || branch === "master") {
    return `${origin}/@${username}/${projectSlug}`;
  }
  // Sanitise branch name for URL
  const safeBranch = branch.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${origin}/@${username}/${projectSlug}-${safeBranch}`;
}
