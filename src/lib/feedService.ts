import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_USER_AVATAR, SYSTEM_AVATAR } from "./avatars";

/** Subscribe to the public developer feed */
export function subscribeFeed(
  callback: (posts: FeedPost[]) => void,
  opts?: { userId?: string; maxItems?: number }
): () => void {
  const feedRef = collection(db, "feed");

  let q;
  if (opts?.userId) {
    q = query(
      feedRef,
      where("userId", "==", opts.userId),
      orderBy("createdAt", "desc"),
      limit(opts?.maxItems ?? 50)
    );
  } else {
    q = query(
      feedRef,
      where("isPublic", "==", true),
      orderBy("createdAt", "desc"),
      limit(opts?.maxItems ?? 100)
    );
  }

  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedPost));
    callback(posts);
  });
}

/** Create a new feed post */
export async function createFeedPost(params: {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  content: string;
  type: FeedPost["type"];
  projectId?: string;
  projectName?: string;
  isPublic: boolean;
}): Promise<string> {
  const docRef = await addDoc(collection(db, "feed"), {
    userId: params.userId,
    username: params.username,
    displayName: params.displayName ?? "",
    avatarUrl: params.avatarUrl ?? "",
    content: params.content,
    type: params.type,
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.projectName ? { projectName: params.projectName } : {}),
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    isPublic: params.isPublic,
  });
  return docRef.id;
}

/** Auto-post on deployment */
export async function autoPostDeployment(params: {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  projectId: string;
  projectName: string;
  isPublic: boolean;
}): Promise<void> {
  if (!params.isPublic) return; // private projects excluded
  await createFeedPost({
    ...params,
    content: `🚀 Just deployed "${params.projectName}"!`,
    type: "deployment",
  });
}

/** Toggle like on a feed post */
export async function toggleLike(postId: string, uid: string, liked: boolean): Promise<void> {
  const postRef = doc(db, "feed", postId);
  if (liked) {
    await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(uid) });
  } else {
    await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(uid) });
  }
}

/**
 * Create an official DevOS post in the public feed.
 * Always public and marked as official.
 */
export async function createAdminPost(params: {
  content: string;
  type: "announcement" | "update" | "feature";
  createdBy: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, "feed"), {
    userId: "admin",
    username: "DevOS",
    displayName: "DevOS",
    avatarUrl: SYSTEM_AVATAR,
    content: params.content,
    type: params.type,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    isPublic: true,
    isOfficial: true,
  });
  return docRef.id;
}
