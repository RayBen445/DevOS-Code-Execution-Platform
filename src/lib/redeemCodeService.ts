import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { RedeemCode } from "../types";

export type RedeemResult =
  | { success: true; value: number }
  | { success: false; error: string };

/** Validate and apply a redeem code for a user. Returns credits awarded. */
export async function redeemCode(
  code: string,
  uid: string
): Promise<RedeemResult> {
  const codeId = code.trim().toUpperCase();
  const codeRef = doc(db, "redeem_codes", codeId);
  const snap = await getDoc(codeRef);

  if (!snap.exists()) {
    return { success: false, error: "Invalid or expired code." };
  }

  const data = snap.data() as RedeemCode;

  if (!data.isActive) {
    return { success: false, error: "Invalid or expired code." };
  }

  if (data.expiresAt) {
    const expiresMs =
      typeof data.expiresAt.toMillis === "function"
        ? data.expiresAt.toMillis()
        : data.expiresAt;
    if (Date.now() > expiresMs) {
      return { success: false, error: "Invalid or expired code." };
    }
  }

  if (data.usageLimit !== -1 && data.usedCount >= data.usageLimit) {
    return { success: false, error: "Invalid or expired code." };
  }

  // Check per-user limit
  const userRedemptionRef = doc(db, "users", uid, "redeemed_codes", codeId);
  const userRedemptionSnap = await getDoc(userRedemptionRef);

  if (userRedemptionSnap.exists()) {
    const timesRedeemed = userRedemptionSnap.data().timesRedeemed ?? 1;
    if (timesRedeemed >= data.perUserLimit) {
      return { success: false, error: "You have already redeemed this code." };
    }
  }

  // Apply reward
  if (data.type === "credits") {
    const creditsRef = doc(db, "user_credits", uid);
    await setDoc(creditsRef, { daily: increment(data.value) }, { merge: true });
  }

  // Record redemption
  await updateDoc(codeRef, { usedCount: increment(1) });
  if (userRedemptionSnap.exists()) {
    await updateDoc(userRedemptionRef, { timesRedeemed: increment(1) });
  } else {
    await setDoc(userRedemptionRef, {
      redeemedAt: serverTimestamp(),
      timesRedeemed: 1,
    });
  }

  return { success: true, value: data.value };
}

/** Admin: create a new redeem code */
export async function createRedeemCode(params: {
  code: string;
  type: "credits";
  value: number;
  usageLimit: number;
  perUserLimit: number;
  expiresAt: Date | null;
  createdBy: string;
}): Promise<void> {
  const codeId = params.code.trim().toUpperCase();
  await setDoc(doc(db, "redeem_codes", codeId), {
    type: params.type,
    value: params.value,
    expiresAt: params.expiresAt ? Timestamp.fromDate(params.expiresAt) : null,
    usageLimit: params.usageLimit,
    usedCount: 0,
    perUserLimit: params.perUserLimit,
    isActive: true,
    createdBy: params.createdBy,
    createdAt: serverTimestamp(),
  });
}

/** Admin: toggle code active/inactive */
export async function toggleRedeemCode(
  codeId: string,
  isActive: boolean
): Promise<void> {
  await updateDoc(doc(db, "redeem_codes", codeId), { isActive });
}

/** Admin: delete a redeem code */
export async function deleteRedeemCode(codeId: string): Promise<void> {
  await deleteDoc(doc(db, "redeem_codes", codeId));
}
