import { generateAppId } from '../utils';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Project, Commit, FileData } from "../types";

export interface ForkOptions {
  /** Custom name for the fork. Defaults to "<original> (Fork)". */
  name?: string;
  /** Whether to make the fork public. Defaults to false. */
  isPublic?: boolean;
}

/**
 * Fork a project: duplicate all files and metadata into a new project owned by
 * `newOwnerId`. Returns the new project's Firestore document ID.
 *
 * Improvements over the original:
 *  - Copies language, tags, framework, thumbnail, entryFile, and plugins.
 *  - Accepts ForkOptions for custom name and visibility.
 *  - Sets forkedFromTitle for easy display without an extra DB read.
 */
export async function forkProject(
  project: Project,
  newOwnerId: string,
  newOwnerUsername: string,
  options: ForkOptions = {}
): Promise<string> {
  const forkName = options.name ?? `${project.name} (Fork)`;

  const docRef = await addDoc(collection(db, "projects"), {
      appId: generateAppId(),
    // Identity
    name: forkName,
    title: forkName,
    description: project.description || "",
    // Ownership
    ownerId: newOwnerId,
    ownerUsername: newOwnerUsername,
    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Metadata copied from original
    language: project.language || "",
    tags: project.tags || [],
    framework: (project as any).framework || "",
    thumbnailUrl: (project as any).thumbnailUrl || "",
    entryFile: project.entryFile || "index.html",
    // Plugin config carried over so the fork starts with the same stack
    plugins: project.plugins || {},
    env: project.env || {},
    // Defaults
    collaborators: [],
    isPublic: options.isPublic ?? false,
    isTemplate: false,
    forksCount: 0,
    views: 0,
    deployStatus: "idle",
    deployed: false,
    // Fork provenance
    forkedFrom: project.id,
    forkedFromOwner: project.ownerUsername || "",
    forkedFromTitle: project.title || project.name || "",
    parentProjectId: project.id,
  });

  // Copy files
  const filesSnapshot = await getDocs(collection(db, "projects", project.id, "files"));
  await Promise.all(
    filesSnapshot.docs.map((fileDoc) =>
      addDoc(collection(db, "projects", docRef.id, "files"), {
        ...fileDoc.data(),
        projectId: docRef.id,
        updatedAt: serverTimestamp(),
      })
    )
  );

  // Increment fork count on original
  await updateDoc(doc(db, "projects", project.id), {
    forksCount: increment(1),
  });

  return docRef.id;
}

/**
 * Saves a version (commit) of the project files to the 'commits' subcollection.
 */
export async function saveProjectVersion(
  projectId: string,
  message: string,
  authorId: string,
  authorName: string,
  files: FileData[]
): Promise<string> {
  const filesSnapshot = files.map(f => ({
    name: f.name,
    path: f.path,
    content: f.content,
    language: f.language,
  }));

  const commitRef = await addDoc(collection(db, "projects", projectId, "commits"), {
    projectId,
    message,
    authorId,
    authorName,
    timestamp: serverTimestamp(),
    filesSnapshot,
  });

  return commitRef.id;
}

/**
 * Fetches all versions (commits) for a project, ordered from newest to oldest.
 */
export async function getProjectVersions(projectId: string): Promise<Commit[]> {
  const q = query(
    collection(db, "projects", projectId, "commits"),
    orderBy("timestamp", "desc")
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Commit));
}
