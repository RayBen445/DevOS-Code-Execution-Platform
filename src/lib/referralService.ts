import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  increment,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { Referral, ReferralStats } from "../types";

const REFERRER_BONUS = 25;   // credits awarded to the referrer
const REFERRED_BONUS = 15;   // credits awarded to the new user

/** Derive a stable referral code from a uid (first 8 chars, upper-cased). */
function deriveCode(uid: string): string {
  return uid.slice(0, 8).toUpperCase();
}

/**
 * Get the referral code for a user.
 * Creates the mapping in `referral_codes` if it doesn't exist yet.
 */
export async function getOrCreateReferralCode(uid: string): Promise<string> {
  const code = deriveCode(uid);
  const ref = doc(db, "referral_codes", code);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, code, createdAt: serverTimestamp() });
  }
  return code;
}

/**
 * Look up which uid owns a given referral code.
 * Returns null if the code is invalid.
 */
async function codeToUid(code: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "referral_codes", code.toUpperCase()));
  return snap.exists() ? (snap.data().uid as string) : null;
}

/**
 * Process a referral when a new user signs up.
 * - Records the referral
 * - Adds bonus credits to both users
 * - Returns false if code is invalid, self-referral, or already used
 */
export async function processReferral(
  referralCode: string,
  newUserId: string
): Promise<boolean> {
  const code = referralCode.trim().toUpperCase();
  const referrerId = await codeToUid(code);

  if (!referrerId) return false;
  if (referrerId === newUserId) return false;

  // Check if already referred
  const existingQ = query(
    collection(db, "referrals"),
    where("referredId", "==", newUserId),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) return false;

  // Award new user's credits first (they own this doc — always succeeds)
  await setDoc(
    doc(db, "user_credits", newUserId),
    { daily: increment(REFERRED_BONUS) },
    { merge: true }
  );

  // Record referral event
  await addDoc(collection(db, "referrals"), {
    referrerId,
    referredId: newUserId,
    referralCode: code,
    createdAt: serverTimestamp(),
  });

  // Award referrer's credits (Firestore rule allows a +REFERRER_BONUS increment
  // from any authenticated user to support client-side referral processing)
  await setDoc(
    doc(db, "user_credits", referrerId),
    { daily: increment(REFERRER_BONUS) },
    { merge: true }
  );

  return true;
}

/**
 * Fetch referral stats for a user.
 */
export async function getReferralStats(uid: string): Promise<ReferralStats> {
  const code = await getOrCreateReferralCode(uid);

  const q = query(collection(db, "referrals"), where("referrerId", "==", uid));
  const snap = await getDocs(q);
  const referrals = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Referral));

  return { code, totalReferrals: referrals.length, referrals };
}

export { REFERRER_BONUS, REFERRED_BONUS };
