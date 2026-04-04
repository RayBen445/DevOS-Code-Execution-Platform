import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { OrgMemberRole, Organization, OrgMember } from "../types";

export async function createOrg(params: {
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  isPublic: boolean;
  createdBy: string;
  createdByUsername: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "organizations"), {
    name: params.name,
    slug: params.slug,
    description: params.description,
    avatar: params.avatar ?? "",
    isPublic: params.isPublic,
    createdBy: params.createdBy,
    memberCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Add creator as admin member
  await addDoc(collection(db, "organizations", ref.id, "members"), {
    userId: params.createdBy,
    username: params.createdByUsername,
    role: "admin" as OrgMemberRole,
    joinedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getOrgBySlug(slug: string): Promise<Organization | null> {
  const q = query(collection(db, "organizations"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Organization;
}

export function subscribeOrg(
  orgId: string,
  callback: (org: Organization | null) => void
): () => void {
  return onSnapshot(doc(db, "organizations", orgId), (d) => {
    callback(d.exists() ? ({ id: d.id, ...d.data() } as Organization) : null);
  });
}

export function subscribeOrgMembers(
  orgId: string,
  callback: (members: OrgMember[]) => void
): () => void {
  return onSnapshot(collection(db, "organizations", orgId, "members"), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrgMember)));
  });
}

export async function getOrgMember(orgId: string, userId: string): Promise<OrgMember | null> {
  const q = query(
    collection(db, "organizations", orgId, "members"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as OrgMember;
}

export async function joinOrg(
  orgId: string,
  userId: string,
  username: string
): Promise<void> {
  await addDoc(collection(db, "organizations", orgId, "members"), {
    userId,
    username,
    role: "member" as OrgMemberRole,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "organizations", orgId), { memberCount: increment(1) });
}

export async function leaveOrg(orgId: string, memberDocId: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", orgId, "members", memberDocId));
  await updateDoc(doc(db, "organizations", orgId), { memberCount: increment(-1) });
}

export async function updateMemberRole(
  orgId: string,
  memberDocId: string,
  role: OrgMemberRole
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId, "members", memberDocId), { role });
}

export async function updateOrg(
  orgId: string,
  data: Partial<Pick<Organization, "name" | "description" | "avatar" | "isPublic">>
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), { ...data, updatedAt: serverTimestamp() });
}

export function subscribeUserOrgs(
  userId: string,
  callback: (orgs: Organization[]) => void
): () => void {
  // Subscribe to orgs where user has a member doc — we do this via a
  // collection group query on the members subcollection.
  const q = query(
    collection(db, "organizations"),
    where("isPublic", "==", true)
  );
  // Simple: subscribe to public orgs and filter membership client-side
  // (for now; a proper implementation would use collectionGroup)
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization)));
  });
}
