import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  limit,
  getCountFromServer,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: any;
}

/** Check if `uid` is following `targetId` */
export async function isFollowing(uid: string, targetId: string): Promise<boolean> {
  if (uid === targetId) return false;
  const q = query(
    collection(db, "follows"),
    where("followerId", "==", uid),
    where("followingId", "==", targetId),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Follow a user. No-ops if already following or self-follow. */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) return;
  const already = await isFollowing(followerId, followingId);
  if (already) return;
  await addDoc(collection(db, "follows"), {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
}

/** Unfollow a user. No-ops if not following. */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const q = query(
    collection(db, "follows"),
    where("followerId", "==", followerId),
    where("followingId", "==", followingId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

/** Get follower count for a user */
export async function getFollowerCount(uid: string): Promise<number> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, "follows"), where("followingId", "==", uid))
    );
    return snap.data().count;
  } catch {
    const snap = await getDocs(
      query(collection(db, "follows"), where("followingId", "==", uid))
    );
    return snap.size;
  }
}

/** Get following count for a user */
export async function getFollowingCount(uid: string): Promise<number> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, "follows"), where("followerId", "==", uid))
    );
    return snap.data().count;
  } catch {
    const snap = await getDocs(
      query(collection(db, "follows"), where("followerId", "==", uid))
    );
    return snap.size;
  }
}

/** Get list of UIDs that uid is following */
export async function getFollowing(uid: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "follows"), where("followerId", "==", uid))
  );
  return snap.docs.map((d) => d.data().followingId as string);
}

/** Subscribe to real-time follow status between two users */
export function subscribeIsFollowing(
  uid: string,
  targetId: string,
  callback: (following: boolean) => void
): () => void {
  if (uid === targetId) {
    callback(false);
    return () => {};
  }
  const q = query(
    collection(db, "follows"),
    where("followerId", "==", uid),
    where("followingId", "==", targetId),
    limit(1)
  );
  return onSnapshot(q, (snap) => callback(!snap.empty));
}
