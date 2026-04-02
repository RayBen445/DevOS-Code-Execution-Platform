import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { Project } from "../types";

/**
 * Fork a project: duplicate all files into a new project owned by `newOwnerId`.
 * Returns the new project's Firestore document ID.
 */
export async function forkProject(
  project: Project,
  newOwnerId: string,
  newOwnerUsername: string
): Promise<string> {
  const docRef = await addDoc(collection(db, "projects"), {
    name: `${project.name} (Fork)`,
    description: project.description || "",
    ownerId: newOwnerId,
    ownerUsername: newOwnerUsername,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    collaborators: [],
    isPublic: false,
    isTemplate: false,
    forksCount: 0,
    views: 0,
    parentProjectId: project.id,
    forkedFrom: project.id,
    forkedFromOwner: project.ownerUsername || "",
    deployStatus: "idle",
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
