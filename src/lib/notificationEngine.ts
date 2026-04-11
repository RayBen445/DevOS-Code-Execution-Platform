/**
 * Notification Engine
 *
 * Unified entry point for creating in-app notifications and optionally
 * dispatching an email via the queue.
 *
 * Usage:
 *   import { notify } from "./notificationEngine";
 *
 *   await notify({
 *     userId: "uid",
 *     type: "deploy",
 *     title: "Deployment successful",
 *     message: "project-foo is now live",
 *     metadata: { url: "https://..." },
 *   });
 */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { enqueueEmail } from "./emailQueueService";
import type { UserNotificationSettings } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = "event" | "deploy" | "system" | "bot" | "comment";

export interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  /** If provided and user settings allow, an email will be queued */
  emailTemplateKey?: string;
  emailPayload?: Record<string, any>;
}

const NOTIF_COLL = "notifications";
const SETTINGS_COLL = "user_notification_settings";

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification and, if the user has opted in, enqueue
 * an email for the same event.
 */
export async function notify(params: NotifyParams): Promise<string> {
  // 1. Write in-app notification
  const ref = await addDoc(collection(db, NOTIF_COLL), {
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    read: false,
    metadata: params.metadata ?? {},
    createdAt: serverTimestamp(),
  });

  // 2. Optionally send email
  if (params.emailTemplateKey) {
    try {
      const settingsSnap = await getDoc(doc(db, SETTINGS_COLL, params.userId));
      const settings = settingsSnap.exists()
        ? (settingsSnap.data() as UserNotificationSettings)
        : null;

      const emailEnabled = settings?.emailEnabled ?? true; // default opt-in
      const typeEnabled = settings?.types?.[params.type] ?? true;

      if (emailEnabled && typeEnabled) {
        // Look up user email
        const userSnap = await getDoc(doc(db, "users", params.userId));
        const email = userSnap.exists() ? userSnap.data().email ?? null : null;

        if (email) {
          await enqueueEmail({
            to: email,
            templateKey: params.emailTemplateKey,
            payload: params.emailPayload ?? { title: params.title, message: params.message },
            userId: params.userId,
          });
        }
      }
    } catch {
      // Email delivery is best-effort — never fail the notification itself
    }
  }

  return ref.id;
}

// ---------------------------------------------------------------------------
// Mark as read
// ---------------------------------------------------------------------------

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, NOTIF_COLL, notifId), { read: true });
}

// ---------------------------------------------------------------------------
// Real-time subscription
// ---------------------------------------------------------------------------

export function subscribeNotifications(
  userId: string,
  callback: (notifications: any[]) => void,
  maxCount = 20
): () => void {
  const q = query(
    collection(db, NOTIF_COLL),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ---------------------------------------------------------------------------
// User notification settings
// ---------------------------------------------------------------------------

export async function getUserNotificationSettings(
  userId: string
): Promise<UserNotificationSettings> {
  const snap = await getDoc(doc(db, SETTINGS_COLL, userId));
  if (!snap.exists()) {
    return { userId, emailEnabled: true, types: {} };
  }
  return snap.data() as UserNotificationSettings;
}

export async function saveUserNotificationSettings(
  settings: UserNotificationSettings
): Promise<void> {
  await updateDoc(doc(db, SETTINGS_COLL, settings.userId), { ...settings });
}
