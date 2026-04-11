/**
 * Email Queue Service (client-side)
 *
 * Enqueues email jobs into the `email_jobs` Firestore collection.
 * The actual sending and retry logic runs server-side via
 * /api/email-worker (called periodically or by a Cloud Function).
 *
 * Retry strategy (exponential backoff):
 *   attempt 1 → retry in  1 min
 *   attempt 2 → retry in  5 min
 *   attempt 3 → retry in 15 min
 *   > 3       → status = "failed"
 */

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { EmailJob, EmailJobStatus } from "../types";
import { logAudit } from "./auditService";

const COLL = "email_jobs";

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000]; // 1m, 5m, 15m

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

export interface EnqueueEmailParams {
  to: string;
  templateKey: string;
  payload: Record<string, any>;
  /** Optional; defaults to now */
  scheduledAt?: Date;
  userId?: string;
}

/**
 * Add an email job to the queue. Returns the new job document ID.
 */
export async function enqueueEmail(params: EnqueueEmailParams): Promise<string> {
  const ref = await addDoc(collection(db, COLL), {
    to: params.to,
    templateKey: params.templateKey,
    payload: params.payload,
    status: "queued" as EmailJobStatus,
    attempts: 0,
    maxAttempts: 3,
    lastError: null,
    scheduledAt: params.scheduledAt
      ? Timestamp.fromDate(params.scheduledAt)
      : serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (params.userId) {
    logAudit({
      userId: params.userId,
      action: "email_queued",
      metadata: { to: params.to, templateKey: params.templateKey, jobId: ref.id },
    });
  }

  return ref.id;
}

// ---------------------------------------------------------------------------
// Template rendering (client-side, for preview)
// ---------------------------------------------------------------------------

/**
 * Render a template's HTML by replacing {{variable}} placeholders with
 * values from the payload map.
 */
export function renderTemplate(html: string, payload: Record<string, any>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key) =>
    key in payload ? String(payload[key]) : ""
  );
}

// ---------------------------------------------------------------------------
// Queries (admin / worker use)
// ---------------------------------------------------------------------------

/** Fetch up to N queued jobs that are due to be processed now. */
export async function fetchDueJobs(maxCount = 10): Promise<EmailJob[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, COLL),
    where("status", "==", "queued"),
    where("scheduledAt", "<=", now),
    orderBy("scheduledAt", "asc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailJob));
}

/**
 * Calculate the next scheduled retry time using exponential backoff.
 */
export function nextRetryAt(attempt: number): Date {
  const delayMs = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return new Date(Date.now() + delayMs);
}

/** Mark a job as failed (exceeded maxAttempts). */
export async function markEmailFailed(jobId: string, error: string, userId?: string): Promise<void> {
  await updateDoc(doc(db, COLL, jobId), {
    status: "failed" as EmailJobStatus,
    lastError: error,
    updatedAt: serverTimestamp(),
  });
  if (userId) {
    logAudit({ userId, action: "email_failed", metadata: { jobId, error } });
  }
}
