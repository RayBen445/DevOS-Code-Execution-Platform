import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { UserActivity, UserActivityType } from "../types";

const COLL = "user_activities";

/** Write one activity event for the user. Fire-and-forget (errors are swallowed). */
export async function trackActivity(
  userId: string,
  type: UserActivityType,
  meta?: { projectId?: string; eventId?: string; postId?: string }
): Promise<void> {
  try {
    await addDoc(collection(db, COLL), {
      userId,
      type,
      ...meta,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-critical — never throw to the caller
  }
}

/** ISO date string "YYYY-MM-DD" from a Firestore Timestamp or JS Date */
function toDateKey(ts: any): string {
  try {
    const date: Date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

/** Build the 365-day (52 × 7) bucket map for the heatmap */
export async function getUserActivityHeatmap(
  userId: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  // Seed every day in the last 365 days with 0
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  // One year ago
  const yearAgo = new Date(today);
  yearAgo.setFullYear(today.getFullYear() - 1);
  const yearAgoTs = Timestamp.fromDate(yearAgo);

  try {
    const q = query(
      collection(db, COLL),
      where("userId", "==", userId),
      where("createdAt", ">=", yearAgoTs),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const key = toDateKey(d.data().createdAt);
      if (key && map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    });
  } catch {
    // Return whatever we have
  }

  return map;
}

/** Fetch all raw activities for a user in the last year. */
export async function getUserActivities(userId: string): Promise<UserActivity[]> {
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  const q = query(
    collection(db, COLL),
    where("userId", "==", userId),
    where("createdAt", ">=", Timestamp.fromDate(yearAgo)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserActivity));
}
