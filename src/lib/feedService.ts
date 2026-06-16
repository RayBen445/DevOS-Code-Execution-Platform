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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_USER_AVATAR, SYSTEM_AVATAR } from "./avatars";
import { FeedComment, FeedPost } from "../types";
import { trackActivity } from "./activityService";

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
  communityId?: string;
  communityName?: string;
  communitySlug?: string;
  mentions?: string[]; // array of @mentioned usernames
  attachments?: string[]; // array of image URLs
  isOfficial?: boolean;
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
    ...(params.communityId ? { communityId: params.communityId } : {}),
    ...(params.communityName ? { communityName: params.communityName } : {}),
    ...(params.communitySlug ? { communitySlug: params.communitySlug } : {}),
    ...(params.mentions?.length ? { mentions: params.mentions } : {}),
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    ...(params.isOfficial ? { isOfficial: true } : {}),
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    commentsCount: 0,
    repostCount: 0,
    viewsCount: 0,
    isPublic: params.isPublic,
  });
  // Track post creation as a platform activity
  trackActivity(params.userId, "post", { postId: docRef.id });
  return docRef.id;
}
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
    content: `Just deployed "${params.projectName}"!`,
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

export async function likePost(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, "feed", postId);
  await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(uid) });
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  const postRef = doc(db, "feed", postId);
  await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(uid) });
}

/**
 * Create an official DevOS post in the public feed.
 * Always public and marked as official.
 */
export async function createAdminPost(params: {
  content: string;
  type: "announcement" | "update" | "feature";
  createdBy: string;
  attachments?: string[];
}): Promise<string> {
  const docRef = await addDoc(collection(db, "feed"), {
    userId: "admin",
    username: "DevOS",
    displayName: "DevOS",
    avatarUrl: SYSTEM_AVATAR,
    content: params.content,
    type: params.type,
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    isPublic: true,
    isOfficial: true,
  });
  return docRef.id;
}

/** Increment viewsCount when a post is opened/expanded */
export async function incrementViewCount(postId: string): Promise<void> {
  await updateDoc(doc(db, "feed", postId), { viewsCount: increment(1) });
}

/** Add a comment on a feed post */
export async function addComment(params: {
  postId: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  content: string;
  mentions?: string[]; // array of @mentioned usernames
}): Promise<string> {
  const commentRef = await addDoc(collection(db, "comments"), {
    postId: params.postId,
    userId: params.userId,
    username: params.username,
    displayName: params.displayName ?? "",
    avatarUrl: params.avatarUrl ?? "",
    content: params.content,
    createdAt: serverTimestamp(),
    ...(params.mentions?.length ? { mentions: params.mentions } : {}),
  });
  // Increment comment count on the post
  await updateDoc(doc(db, "feed", params.postId), { commentsCount: increment(1) });
  return commentRef.id;
}

/** Subscribe to comments for a specific post */
export function subscribeComments(
  postId: string,
  callback: (comments: FeedComment[]) => void
): () => void {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedComment)));
  });
}

/**
 * Repost a feed post with optional commentary.
 * Prevents infinite repost chains: if the original is already a repost,
 * we reference its originalPostId instead.
 */
export async function repostPost(params: {
  originalPost: FeedPost;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  commentary: string;
}): Promise<string> {
  // Prevent chain reposts — always reference the root post
  const rootPostId = params.originalPost.originalPostId ?? params.originalPost.id;

  const originalSnapshot: Omit<FeedPost, "originalPost"> = {
    id: params.originalPost.id,
    userId: params.originalPost.userId,
    username: params.originalPost.username,
    displayName: params.originalPost.displayName ?? "",
    avatarUrl: params.originalPost.avatarUrl ?? "",
    content: params.originalPost.content,
    type: params.originalPost.type,
    createdAt: params.originalPost.createdAt?.toDate?.()?.toISOString?.() ?? params.originalPost.createdAt,
    likes: params.originalPost.likes ?? 0,
    likedBy: params.originalPost.likedBy ?? [],
    commentsCount: params.originalPost.commentsCount ?? 0,
    repostCount: params.originalPost.repostCount ?? 0,
    viewsCount: params.originalPost.viewsCount ?? 0,
    isPublic: params.originalPost.isPublic ?? true,
    ...(params.originalPost.projectId ? { projectId: params.originalPost.projectId } : {}),
    ...(params.originalPost.projectName ? { projectName: params.originalPost.projectName } : {}),
    ...(params.originalPost.communityId ? { communityId: params.originalPost.communityId } : {}),
    ...(params.originalPost.communityName ? { communityName: params.originalPost.communityName } : {}),
    ...(params.originalPost.communitySlug ? { communitySlug: params.originalPost.communitySlug } : {}),
    ...(params.originalPost.isOfficial ? { isOfficial: true } : {}),
  };

  const docRef = await addDoc(collection(db, "feed"), {
    userId: params.userId,
    username: params.username,
    displayName: params.displayName ?? "",
    avatarUrl: params.avatarUrl ?? "",
    content: params.commentary,
    type: "repost",
    originalPostId: rootPostId,
    originalPost: originalSnapshot,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    commentsCount: 0,
    repostCount: 0,
    viewsCount: 0,
    isPublic: true,
  });

  // Increment repost count on the original post
  await updateDoc(doc(db, "feed", rootPostId), { repostCount: increment(1) });

  return docRef.id;
}

/** Delete a post by its ID. Only the owner should call this. */
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "feed", postId));
}

/** Edit a post's content by its ID. Only the owner should call this. */
export async function editPost(postId: string, newContent: string, newAttachments?: string[]): Promise<void> {
  const updateData: any = { content: newContent };
  if (newAttachments !== undefined) {
    updateData.attachments = newAttachments;
  }
  await updateDoc(doc(db, "feed", postId), updateData);
}

/** Delete a comment by its ID. Decrements commentsCount on the parent post. */
export async function deleteComment(commentId: string, postId: string): Promise<void> {
  await deleteDoc(doc(db, "comments", commentId));
  await updateDoc(doc(db, "feed", postId), { commentsCount: increment(-1) });
}
