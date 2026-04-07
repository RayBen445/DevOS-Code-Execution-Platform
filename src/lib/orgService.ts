import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  collectionGroup,
} from "firebase/firestore";
import { db } from "./firebase";
import { OrgMemberRole, Organization, OrgMember, OrgJoinRequest, OrgChatMessage } from "../types";

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
  // Add creator as admin member — use userId as doc ID (matches security rules)
  await setDoc(doc(db, "organizations", ref.id, "members", params.createdBy), {
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
  // Member doc ID is userId (same pattern as communities)
  const snap = await getDoc(doc(db, "organizations", orgId, "members", userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as OrgMember;
}

export async function joinOrg(
  orgId: string,
  userId: string,
  username: string
): Promise<void> {
  await setDoc(doc(db, "organizations", orgId, "members", userId), {
    userId,
    username,
    role: "member" as OrgMemberRole,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "organizations", orgId), { memberCount: increment(1) });
}

export async function leaveOrg(orgId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", orgId, "members", userId));
  await updateDoc(doc(db, "organizations", orgId), { memberCount: increment(-1) });
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: OrgMemberRole
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId, "members", userId), { role });
}

export async function updateOrg(
  orgId: string,
  data: Partial<Pick<Organization, "name" | "description" | "avatar" | "isPublic">>
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), { ...data, updatedAt: serverTimestamp() });
}

/**
 * Subscribe to organizations the current user is a member of.
 * Uses a collectionGroup query on the `members` subcollection filtered by userId.
 * Falls back to returning all public orgs if collectionGroup is unavailable.
 */
export function subscribeUserOrgs(
  userId: string,
  callback: (orgs: Organization[]) => void
): () => void {
  const q = query(
    collectionGroup(db, "members"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, async (snap) => {
    const orgIds = snap.docs
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => Boolean(id));

    if (orgIds.length === 0) {
      callback([]);
      return;
    }

    const orgDocs = await Promise.all(
      orgIds.map((id) => getDoc(doc(db, "organizations", id)))
    );
    callback(
      orgDocs
        .filter((d) => d.exists())
        .map((d) => ({ id: d.id, ...d.data() } as Organization))
    );
  });
}


// ── Join Request System ──────────────────────────────────────────────────────

export async function requestJoinOrg(
  orgId: string,
  userId: string,
  username: string,
  displayName?: string,
  avatarUrl?: string
): Promise<void> {
  await setDoc(doc(db, "organizations", orgId, "joinRequests", userId), {
    userId,
    username,
    displayName: displayName ?? username,
    avatarUrl: avatarUrl ?? "",
    requestedAt: serverTimestamp(),
    status: "pending",
  });
}

export async function approveJoinRequest(
  orgId: string,
  userId: string,
  username: string
): Promise<void> {
  await setDoc(doc(db, "organizations", orgId, "members", userId), {
    userId,
    username,
    role: "member" as OrgMemberRole,
    joinedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "organizations", orgId), { memberCount: increment(1) });
  await updateDoc(doc(db, "organizations", orgId, "joinRequests", userId), { status: "approved" });
}

export async function rejectJoinRequest(orgId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId, "joinRequests", userId), { status: "rejected" });
}

export function subscribeJoinRequests(
  orgId: string,
  callback: (requests: OrgJoinRequest[]) => void
): () => void {
  const q = query(
    collection(db, "organizations", orgId, "joinRequests"),
    where("status", "==", "pending")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrgJoinRequest)));
  });
}

export async function updateOrgJoinPolicy(
  orgId: string,
  joinPolicy: "open" | "request"
): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), { joinPolicy, updatedAt: serverTimestamp() });
}

/** Fetch every organization (admin use). */
export async function getAllOrgs(): Promise<Organization[]> {
  const snap = await getDocs(collection(db, "organizations"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
}

/** Permanently delete an organization document (does NOT cascade-delete subcollections). */
export async function deleteOrg(orgId: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", orgId));
}

/** Fetch all public organizations, ordered by memberCount descending. */
export async function getPublicOrgs(): Promise<Organization[]> {
  const q = query(collection(db, "organizations"), where("isPublic", "==", true));
  const snap = await getDocs(q);
  const orgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization));
  return orgs.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
}

// ── Organization Chat ────────────────────────────────────────────────────────

/** Subscribe to the live chat messages for an organization (last 100). */
export function subscribeOrgChatMessages(
  orgId: string,
  callback: (messages: OrgChatMessage[]) => void,
  maxItems = 100
): () => void {
  const q = query(
    collection(db, "organizations", orgId, "chat"),
    orderBy("createdAt", "asc"),
    limit(maxItems)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrgChatMessage)));
  });
}

/** Send a chat message to an organization (members only — enforced by Firestore rules). */
export async function sendOrgChatMessage(params: {
  orgId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
}): Promise<void> {
  await addDoc(collection(db, "organizations", params.orgId, "chat"), {
    userId: params.userId,
    username: params.username,
    displayName: params.displayName ?? "",
    avatarUrl: params.avatarUrl ?? "",
    text: params.text.trim(),
    createdAt: serverTimestamp(),
  });
}

/** Delete a chat message (sender or org admin/moderator). */
export async function deleteOrgChatMessage(orgId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, "organizations", orgId, "chat", messageId));
}

/** Toggle the chatEnabled flag on an organization. */
export async function setOrgChatEnabled(orgId: string, enabled: boolean): Promise<void> {
  await updateDoc(doc(db, "organizations", orgId), { chatEnabled: enabled, updatedAt: serverTimestamp() });
}
