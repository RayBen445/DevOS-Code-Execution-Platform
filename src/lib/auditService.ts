/**
 * Audit Log Service
 *
 * Writes structured audit events to the `audit_logs` Firestore collection.
 * All writes are fire-and-forget — errors are swallowed so they never
 * interrupt the calling flow.
 *
 * Schema (audit_logs/{id}):
 *   userId     string
 *   orgId      string | null
 *   projectId  string | null
 *   action     AuditAction
 *   metadata   Record<string, any>
 *   createdAt  Timestamp
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { AuditAction } from "../types";

interface LogAuditParams {
  userId: string;
  action: AuditAction;
  orgId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Write one audit event. Fire-and-forget — never throws.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await addDoc(collection(db, "audit_logs"), {
      userId: params.userId,
      orgId: params.orgId ?? null,
      projectId: params.projectId ?? null,
      action: params.action,
      metadata: params.metadata ?? {},
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-critical — never propagate
  }
}
