import { db, auth } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { Template } from "../types";

export const getApprovedTemplates = async (): Promise<Template[]> => {
  const q = query(
    collection(db, "templates"),
    where("isApproved", "==", true),
    orderBy("downloads", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
};

export const getPendingTemplates = async (): Promise<Template[]> => {
  const q = query(
    collection(db, "templates"),
    where("isApproved", "==", false),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
};

export const getAllTemplates = async (): Promise<Template[]> => {
  const snap = await getDocs(collection(db, "templates"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Template));
};

export const publishTemplate = async (params: {
  name: string;
  description: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  files: Template['files'];
  tags?: string[];
}): Promise<string> => {
  const docRef = await addDoc(collection(db, "templates"), {
    name: params.name,
    description: params.description,
    authorId: params.authorId,
    authorName: params.authorName,
    authorUsername: params.authorUsername,
    files: params.files,
    tags: params.tags || [],
    downloads: 0,
    likes: 0,
    isApproved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const approveTemplate = async (templateId: string): Promise<void> => {
  await updateDoc(doc(db, "templates", templateId), {
    isApproved: true,
    updatedAt: serverTimestamp(),
  });
};

export const rejectTemplate = async (templateId: string): Promise<void> => {
  await deleteDoc(doc(db, "templates", templateId));
};

export const incrementDownloads = async (templateId: string): Promise<void> => {
  await updateDoc(doc(db, "templates", templateId), {
    downloads: increment(1),
  });
};

export const toggleLike = async (templateId: string, liked: boolean): Promise<void> => {
  await updateDoc(doc(db, "templates", templateId), {
    likes: increment(liked ? 1 : -1),
  });
};

export const createOfficialTemplate = async (params: {
  name: string;
  description: string;
  files: Template['files'];
  tags?: string[];
}): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const docRef = await addDoc(collection(db, "templates"), {
    name: params.name,
    description: params.description,
    authorId: user.uid,
    authorName: user.displayName || "DevOS Admin",
    authorUsername: "devos",
    files: params.files,
    tags: params.tags || [],
    downloads: 0,
    likes: 0,
    isApproved: true,
    isOfficial: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateTemplate = async (templateId: string, updates: Partial<Pick<Template, 'name' | 'description' | 'tags'>>): Promise<void> => {
  await updateDoc(doc(db, "templates", templateId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTemplateById = async (templateId: string): Promise<void> => {
  await deleteDoc(doc(db, "templates", templateId));
};

export const updateTemplateFiles = async (templateId: string, files: Template['files']): Promise<void> => {
  await updateDoc(doc(db, "templates", templateId), {
    files,
    updatedAt: serverTimestamp(),
  });
};
