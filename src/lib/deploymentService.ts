import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { Deployment } from "../types";

/**
 * Write a new deployment record to Firestore.
 * Called immediately after a successful deploy to track the event.
 *
 * @returns the new deployment document ID
 */
export async function createDeployment(
  projectId: string,
  userId: string,
  username: string,
  url: string
): Promise<string> {
  const ref = await addDoc(collection(db, "deployments"), {
    projectId,
    userId,
    username,
    url,
    status: "ready",
    createdAt: serverTimestamp(),
    completedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Fetch the most recent "ready" deployment for a given user.
 * Returns null if the user has not deployed anything yet.
 *
 * NOTE: This query requires a composite Firestore index on the `deployments`
 * collection: (userId ASC, status ASC, createdAt DESC). Create it via the
 * Firebase Console → Firestore → Indexes or deploy via firestore.indexes.json.
 */
export async function getLatestUserDeployment(userId: string): Promise<Deployment | null> {
  const q = query(
    collection(db, "deployments"),
    where("userId", "==", userId),
    where("status", "==", "ready"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Deployment;
}

/**
 * Fetch all deployments for a project, newest first (up to 20).
 */
export async function getProjectDeployments(projectId: string): Promise<Deployment[]> {
  const q = query(
    collection(db, "deployments"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deployment));
}

/**
 * Update the status of an existing deployment record.
 * Used to mark a build as "failed" when an error occurs.
 */
export async function updateDeploymentStatus(
  deploymentId: string,
  status: Deployment["status"],
  error?: string
): Promise<void> {
  await updateDoc(doc(db, "deployments", deploymentId), {
    status,
    completedAt: serverTimestamp(),
    ...(error ? { error } : {}),
  });
}
