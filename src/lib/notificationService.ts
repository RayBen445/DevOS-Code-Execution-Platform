import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  writeBatch,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { Notification, NotificationType } from "../types";

/**
 * Subscribe to notifications for a given user.
 * Returns both targeted (userId == uid) and broadcast (userId == "all") notifications.
 */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const notifRef = collection(db, "notifications");

  // Targeted notifications
  const targetedQuery = query(
    notifRef,
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  // Broadcast notifications
  const broadcastQuery = query(
    notifRef,
    where("userId", "==", "all"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  let targeted: Notification[] = [];
  let broadcast: Notification[] = [];

  const merge = () => {
    const combined = [...targeted, ...broadcast].sort((a, b) => {
      const tA = a.createdAt?.toMillis?.() ?? 0;
      const tB = b.createdAt?.toMillis?.() ?? 0;
      return tB - tA;
    });
    callback(combined);
  };

  const unsubTargeted = onSnapshot(targetedQuery, (snap) => {
    targeted = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    merge();
  });

  const unsubBroadcast = onSnapshot(broadcastQuery, (snap) => {
    broadcast = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    merge();
  });

  return () => {
    unsubTargeted();
    unsubBroadcast();
  };
}

/** Count unread notifications for a user */
export function countUnread(notifications: Notification[], uid: string): number {
  return notifications.filter((n) => {
    if (n.userId === "all") {
      return !(n.readBy ?? []).includes(uid);
    }
    return !n.isRead;
  }).length;
}

/** Mark a targeted notification as read */
export async function markAsRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), { isRead: true });
}

/** Mark a broadcast notification as read by a specific user */
export async function markBroadcastRead(notifId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), { readBy: arrayUnion(uid) });
}

/** Mark all notifications as read for a user */
export async function markAllRead(
  notifications: Notification[],
  uid: string
): Promise<void> {
  const toUpdate = notifications.filter((n) => {
    if (n.userId === "all") return !(n.readBy ?? []).includes(uid);
    return n.userId === uid && !n.isRead;
  });

  // Firestore batch limit is 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const n of chunk) {
      if (n.userId === "all") {
        batch.update(doc(db, "notifications", n.id), { readBy: arrayUnion(uid) });
      } else {
        batch.update(doc(db, "notifications", n.id), { isRead: true });
      }
    }
    await batch.commit();
  }
}

/** Send a notification to a specific user or all users (admin only) */
export async function sendNotification(params: {
  userId: string; // uid or "all"
  type: NotificationType;
  title: string;
  message: string;
  createdBy: string;
  projectId?: string;
  link?: string;
}): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    isRead: false,
    readBy: [],
    createdAt: serverTimestamp(),
    createdBy: params.createdBy,
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.link ? { link: params.link } : {}),
  });
}

/** Auto-send deployment notification */
export async function notifyDeployment(params: {
  uid: string;
  projectName: string;
  success: boolean;
  projectId?: string;
}): Promise<void> {
  await sendNotification({
    userId: params.uid,
    type: params.success ? "deployment_success" : "deployment_failed",
    title: params.success
      ? `Deployment successful`
      : `Deployment failed`,
    message: params.success
      ? `"${params.projectName}" was deployed successfully.`
      : `"${params.projectName}" deployment failed. Check your code and try again.`,
    createdBy: "system",
    projectId: params.projectId,
  });
}

/** Auto-send credit warning notification */
export async function notifyCreditWarning(
  uid: string,
  remaining: number
): Promise<void> {
  await sendNotification({
    userId: uid,
    type: "credit_warning",
    title: "Credits running low",
    message: `You have only ${remaining} daily credits remaining. Credits reset every 24 hours.`,
    createdBy: "system",
  });
}

/**
 * Send a follow notification to the followed user.
 * Called client-side by the follower; Firestore rules allow follow-type
 * notifications to be created by the initiating user.
 */
export async function notifyFollow(params: {
  followerId: string;
  followerUsername: string;
  followingId: string;
}): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId: params.followingId,
    type: "follow",
    title: "New follower",
    message: `@${params.followerUsername} started following you.`,
    link: `/u/${params.followerUsername}`,
    isRead: false,
    readBy: [],
    createdAt: serverTimestamp(),
    createdBy: params.followerId,
  });
}

/** Notify a post owner that someone commented on their post */
export async function notifyComment(params: {
  postOwnerId: string;
  commenterUsername: string;
  commenterId: string;
  postId: string;
}): Promise<void> {
  if (params.postOwnerId === params.commenterId) return; // no self-notify
  await addDoc(collection(db, "notifications"), {
    userId: params.postOwnerId,
    type: "post_comment",
    title: "New comment",
    message: `@${params.commenterUsername} commented on your post.`,
    link: `/?post=${params.postId}`,
    isRead: false,
    readBy: [],
    createdAt: serverTimestamp(),
    createdBy: params.commenterId,
  });
}

/** Notify a post owner that someone reposted their post */
export async function notifyRepost(params: {
  postOwnerId: string;
  reposterUsername: string;
  reposterId: string;
  postId: string;
}): Promise<void> {
  if (params.postOwnerId === params.reposterId) return; // no self-notify
  await addDoc(collection(db, "notifications"), {
    userId: params.postOwnerId,
    type: "post_repost",
    title: "Your post was reposted",
    message: `@${params.reposterUsername} reposted your post.`,
    link: `/?post=${params.postId}`,
    isRead: false,
    readBy: [],
    createdAt: serverTimestamp(),
    createdBy: params.reposterId,
  });
}

/** Notify a user that they were @mentioned in a post or comment */
export async function notifyMention(params: {
  mentionedUserId: string;
  mentionedUsername: string;
  mentionerUserId: string;
  mentionerUsername: string;
  contextType: 'post' | 'comment';
  postId: string;
}): Promise<void> {
  if (params.mentionedUserId === params.mentionerUserId) return; // no self-notify
  await addDoc(collection(db, "notifications"), {
    userId: params.mentionedUserId,
    type: "post_mention",
    title: "You were mentioned",
    message: `@${params.mentionerUsername} mentioned you in a ${params.contextType}.`,
    link: `/?post=${params.postId}`,
    isRead: false,
    readBy: [],
    createdAt: serverTimestamp(),
    createdBy: params.mentionerUserId,
  });
}
