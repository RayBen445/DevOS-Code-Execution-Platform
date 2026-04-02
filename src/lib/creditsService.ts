import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Credits } from "../types";

export const DAILY_CREDITS_AMOUNT = 50;
export const MONTHLY_CREDITS_AMOUNT = 200;

export const CREDIT_COSTS = {
  createProject: 5,
  deploy: 10,
  sync: 3,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export interface CreditConfig {
  creditsEnabled: boolean;
  chargePerAction: number; // 0 = use per-action defaults from CREDIT_COSTS
}

/** Read the global credit config from system_config/global */
export const getCreditConfig = async (): Promise<CreditConfig> => {
  const snap = await getDoc(doc(db, "system_config", "global"));
  if (!snap.exists()) {
    return { creditsEnabled: true, chargePerAction: 0 };
  }
  const data = snap.data();
  return {
    creditsEnabled: data.creditsEnabled ?? true,
    chargePerAction: data.chargePerAction ?? 0,
  };
};

/** Persist the global credit config (admin only — enforced by Firestore rules) */
export const saveCreditConfig = async (config: CreditConfig): Promise<void> => {
  _cachedConfig = null; // invalidate cache on save
  await setDoc(doc(db, "system_config", "global"), {
    creditsEnabled: config.creditsEnabled,
    chargePerAction: config.chargePerAction,
  });
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Returns true if the given timestamp is in a different calendar month than now */
function isNewCalendarMonth(lastResetMs: number): boolean {
  const last = new Date(lastResetMs);
  const now = new Date();
  return now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth();
}

export const initializeCredits = async (uid: string): Promise<Credits> => {
  const creditsRef = doc(db, "user_credits", uid);
  const snap = await getDoc(creditsRef);

  if (!snap.exists()) {
    const now = serverTimestamp();
    const credits: Omit<Credits, 'lastDailyReset' | 'lastMonthlyReset'> & { lastDailyReset: any; lastMonthlyReset: any } = {
      daily: DAILY_CREDITS_AMOUNT,
      monthly: MONTHLY_CREDITS_AMOUNT,
      lastDailyReset: now,
      lastMonthlyReset: now,
    };
    await setDoc(creditsRef, credits);
    return { ...credits, lastDailyReset: Timestamp.now(), lastMonthlyReset: Timestamp.now() };
  }

  return snap.data() as Credits;
};

export const getCredits = async (uid: string): Promise<Credits> => {
  const creditsRef = doc(db, "user_credits", uid);
  const snap = await getDoc(creditsRef);

  if (!snap.exists()) {
    return initializeCredits(uid);
  }

  const data = snap.data() as Credits;
  let needsUpdate = false;
  const updates: Partial<Credits> & { lastDailyReset?: any; lastMonthlyReset?: any } = {};

  const now = Date.now();
  const lastDaily = data.lastDailyReset?.toMillis?.() ?? 0;
  const lastMonthly = data.lastMonthlyReset?.toMillis?.() ?? 0;

  if (now - lastDaily >= ONE_DAY_MS) {
    updates.daily = DAILY_CREDITS_AMOUNT;
    updates.lastDailyReset = serverTimestamp();
    needsUpdate = true;
  }

  if (isNewCalendarMonth(lastMonthly)) {
    updates.monthly = MONTHLY_CREDITS_AMOUNT;
    updates.lastMonthlyReset = serverTimestamp();
    needsUpdate = true;
  }

  if (needsUpdate) {
    await updateDoc(creditsRef, updates);
    return { ...data, ...updates } as Credits;
  }

  return data;
};

/** Returns true if credits were deducted, false if insufficient */
export const deductCredits = async (uid: string, action: CreditAction): Promise<boolean> => {
  // Admins bypass all credit checks
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists() && userDoc.data()?.role === "admin") {
    return true;
  }

  // Respect global on/off switch
  const config = await getCreditConfig();
  if (!config.creditsEnabled) {
    return true;
  }

  const cost = config.chargePerAction > 0 ? config.chargePerAction : CREDIT_COSTS[action];
  const credits = await getCredits(uid);

  if (credits.daily + credits.monthly < cost) {
    return false;
  }

  // Drain daily first, then monthly for the remainder
  const dailyUsed = Math.min(credits.daily, cost);
  const remaining = cost - dailyUsed;
  const newDaily = credits.daily - dailyUsed;
  const newMonthly = credits.monthly - remaining;

  const creditsRef = doc(db, "user_credits", uid);
  await updateDoc(creditsRef, { daily: newDaily, monthly: newMonthly });
  return true;
};

export const adjustCredits = async (
  uid: string,
  delta: { daily?: number; monthly?: number }
): Promise<void> => {
  const creditsRef = doc(db, "user_credits", uid);
  const snap = await getDoc(creditsRef);

  if (!snap.exists()) {
    await initializeCredits(uid);
  }

  const current = (snap.exists() ? snap.data() : { daily: DAILY_CREDITS_AMOUNT, monthly: MONTHLY_CREDITS_AMOUNT }) as Credits;
  const updates: Record<string, number> = {};

  if (delta.daily !== undefined) {
    updates.daily = Math.max(0, (current.daily || 0) + delta.daily);
  }
  if (delta.monthly !== undefined) {
    updates.monthly = Math.max(0, (current.monthly || 0) + delta.monthly);
  }

  await updateDoc(creditsRef, updates);
};
