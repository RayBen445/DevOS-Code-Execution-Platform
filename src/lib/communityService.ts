import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { Community, CommunityMember, CommunityMemberRole, FeedPost, CommunityChatMessage } from "../types";

// ─── Read ────────────────────────────────────────────────────────────────────

/** Subscribe to all public communities, ordered by memberCount desc */
export function subscribeCommunities(
  callback: (communities: Community[]) => void,
  opts?: { category?: string; maxItems?: number }
): () => void {
  const ref = collection(db, "communities");
  let q = query(ref, where("isPublic", "==", true), orderBy("memberCount", "desc"), limit(opts?.maxItems ?? 100));
  if (opts?.category) {
    q = query(ref, where("isPublic", "==", true), where("category", "==", opts.category), orderBy("memberCount", "desc"), limit(opts?.maxItems ?? 100));
  }
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Community)));
  });
}

/** Fetch a single community by slug */
export async function getCommunityBySlug(slug: string): Promise<Community | null> {
  const q = query(collection(db, "communities"), where("slug", "==", slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Community;
}

/** Subscribe to a single community doc by id */
export function subscribeCommunity(
  communityId: string,
  callback: (community: Community | null) => void
): () => void {
  return onSnapshot(doc(db, "communities", communityId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...snap.data() } as Community);
  });
}

/** Get membership status for a user in a community */
export async function getMembership(communityId: string, userId: string): Promise<CommunityMember | null> {
  const snap = await getDoc(doc(db, "communities", communityId, "members", userId));
  if (!snap.exists()) return null;
  return { userId, ...snap.data() } as CommunityMember;
}

/** Subscribe to membership status for a user in a community */
export function subscribeMembership(
  communityId: string,
  userId: string,
  callback: (member: CommunityMember | null) => void
): () => void {
  return onSnapshot(doc(db, "communities", communityId, "members", userId), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ userId, ...snap.data() } as CommunityMember);
  });
}

/** Get member list for a community */
export async function getCommunityMembers(communityId: string, maxItems = 50): Promise<CommunityMember[]> {
  const q = query(collection(db, "communities", communityId, "members"), orderBy("joinedAt", "desc"), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ userId: d.id, ...d.data() } as CommunityMember));
}

/** Subscribe to member list */
export function subscribeCommunityMembers(
  communityId: string,
  callback: (members: CommunityMember[]) => void,
  maxItems = 50
): () => void {
  const q = query(collection(db, "communities", communityId, "members"), orderBy("joinedAt", "desc"), limit(maxItems));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ userId: d.id, ...d.data() } as CommunityMember)));
  });
}

/** Subscribe to feed posts for a community */
export function subscribeCommunityFeed(
  communityId: string,
  callback: (posts: FeedPost[]) => void,
  maxItems = 50
): () => void {
  const q = query(
    collection(db, "feed"),
    where("communityId", "==", communityId),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedPost)));
  });
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Create a new community */
export async function createCommunity(params: {
  name: string;
  slug: string;
  description: string;
  avatar?: string;
  banner?: string;
  category?: string;
  createdBy: string;
  isPublic?: boolean;
}): Promise<string> {
  const docRef = await addDoc(collection(db, "communities"), {
    name: params.name,
    slug: params.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    description: params.description,
    avatar: params.avatar ?? "",
    banner: params.banner ?? "",
    category: params.category ?? "general",
    createdBy: params.createdBy,
    memberCount: 1,
    isPublic: params.isPublic ?? true,
    createdAt: serverTimestamp(),
  });

  // Creator auto-joins as admin
  await setDoc(doc(db, "communities", docRef.id, "members", params.createdBy), {
    role: "admin" as CommunityMemberRole,
    joinedAt: serverTimestamp(),
  });

  return docRef.id;
}

/** Join a community */
export async function joinCommunity(communityId: string, userId: string): Promise<void> {
  const existing = await getDoc(doc(db, "communities", communityId, "members", userId));
  if (existing.exists()) return; // already a member

  await setDoc(doc(db, "communities", communityId, "members", userId), {
    role: "member" as CommunityMemberRole,
    joinedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "communities", communityId), {
    memberCount: increment(1),
  });
}

/** Leave a community (non-admins only; last admin cannot leave) */
export async function leaveCommunity(communityId: string, userId: string): Promise<void> {
  const memberSnap = await getDoc(doc(db, "communities", communityId, "members", userId));
  if (!memberSnap.exists()) return;

  await deleteDoc(doc(db, "communities", communityId, "members", userId));

  await updateDoc(doc(db, "communities", communityId), {
    memberCount: increment(-1),
  });
}

/** Update community metadata (community admin or platform admin — enforced by Firestore rules) */
export async function updateCommunity(
  communityId: string,
  updates: Partial<Pick<Community, "name" | "description" | "avatar" | "banner" | "category" | "isPublic">>
): Promise<void> {
  if (!communityId) throw new Error("communityId is required");
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db, "communities", communityId), updates);
}

/** Update member role (community admin only — enforced by Firestore rules) */
export async function updateMemberRole(
  communityId: string,
  userId: string,
  role: CommunityMemberRole
): Promise<void> {
  await updateDoc(doc(db, "communities", communityId, "members", userId), { role });
}

/** Remove a member from a community (moderator/admin action) */
export async function removeMember(communityId: string, userId: string): Promise<void> {
  await deleteDoc(doc(db, "communities", communityId, "members", userId));
  await updateDoc(doc(db, "communities", communityId), {
    memberCount: increment(-1),
  });
}

/** Delete a community entirely (platform admin only) */
export async function deleteCommunity(communityId: string): Promise<void> {
  await deleteDoc(doc(db, "communities", communityId));
}

// ─── Community Chat ───────────────────────────────────────────────────────────

/** Subscribe to real-time chat messages in a community (last 100, oldest first) */
export function subscribeChatMessages(
  communityId: string,
  callback: (messages: CommunityChatMessage[]) => void,
  maxItems = 100
): () => void {
  const q = query(
    collection(db, "communities", communityId, "chat"),
    orderBy("createdAt", "asc"),
    limit(maxItems)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityChatMessage)));
  });
}

/** Send a chat message to a community (members only — enforced by Firestore rules) */
export async function sendChatMessage(params: {
  communityId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
}): Promise<void> {
  await addDoc(collection(db, "communities", params.communityId, "chat"), {
    userId: params.userId,
    username: params.username,
    displayName: params.displayName ?? "",
    avatarUrl: params.avatarUrl ?? "",
    text: params.text.trim(),
    createdAt: serverTimestamp(),
  });
}

/** Delete a chat message (owner or community moderator/admin) */
export async function deleteChatMessage(communityId: string, messageId: string): Promise<void> {
  await deleteDoc(doc(db, "communities", communityId, "chat", messageId));
}
