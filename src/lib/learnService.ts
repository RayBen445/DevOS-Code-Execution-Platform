import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export interface DynamicLesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Raw code example (editable by learner) */
  codeExample: string;
  /** Language for the code runner */
  language: "javascript" | "typescript" | "html";
  /** Explanation text (markdown or plain) */
  explanation: string;
  /** Expected output lines */
  expectedOutput: string[];
  /** Whether the lesson is published (visible to learners) */
  published: boolean;
  createdAt: any;
  updatedAt: any;
}

const COLLECTION = "learn_lessons";

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getPublishedLessons(): Promise<DynamicLesson[]> {
  const q = query(
    collection(db, COLLECTION),
    where("published", "==", true),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DynamicLesson));
}

export async function getAllLessons(): Promise<DynamicLesson[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DynamicLesson));
}

export async function getLessonBySlug(slug: string): Promise<DynamicLesson | null> {
  const q = query(collection(db, COLLECTION), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as DynamicLesson;
}

export async function getLessonById(id: string): Promise<DynamicLesson | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as DynamicLesson;
}

// ── Write (admin only — enforced by Firestore rules) ──────────────────────────

export async function createLesson(
  data: Omit<DynamicLesson, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLesson(
  id: string,
  data: Partial<Omit<DynamicLesson, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Convert a title into a URL-safe slug */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
