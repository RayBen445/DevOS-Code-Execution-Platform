import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion } from "firebase/firestore";
import { Credits, GiftedCredit } from "../types";

export const DAILY_CREDITS_AMOUNT = 50;
export const MONTHLY_CREDITS_AMOUNT = 200;

export const CREDIT_COSTS = {
  createProject: 5,
  deploy: 10,
  sync: 3,
  save: 1,
  post: 2,
  aiRequest: 5,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export interface CreditConfig {
  creditsEnabled: boolean;
  chargePerAction: number; // 0 = use per-action defaults from CREDIT_COSTS
  actionCosts?: Partial<Record<CreditAction, number>>;
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
    actionCosts: data.actionCosts ?? {},
  };
};

/** Persist the global credit config (admin only — enforced by Firestore rules) */
export const saveCreditConfig = async (config: CreditConfig): Promise<void> => {
  await setDoc(doc(db, "system_config", "global"), {
    creditsEnabled: config.creditsEnabled,
    chargePerAction: config.chargePerAction,
    actionCosts: config.actionCosts ?? {},
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

  const credits = await getCredits(uid);

  // Check unlimited pass
  if (credits.creditsUnlimitedUntil) {
    const unlimitedUntilMs = credits.creditsUnlimitedUntil?.toMillis?.() ?? 0;
    if (unlimitedUntilMs > Date.now()) {
      return true;
    }
  }

  const cost = config.chargePerAction > 0
    ? config.chargePerAction
    : (config.actionCosts?.[action] ?? CREDIT_COSTS[action]);

  // Prune expired gifted credits, compute available gifted amount
  const now = Date.now();
  const activeGifted = (credits.gifted ?? []).filter(
    (g) => g.expiresAt === null || !g.expiresAt || (g.expiresAt?.toMillis?.() ?? Infinity) > now
  );
  const expiredIds = (credits.gifted ?? [])
    .filter((g) => g.expiresAt && (g.expiresAt?.toMillis?.() ?? 0) <= now)
    .map((g) => g.id);

  const totalGifted = activeGifted.reduce((sum, g) => sum + g.amount, 0);

  if (totalGifted + credits.daily + credits.monthly < cost) {
    return false;
  }

  const creditsRef = doc(db, "user_credits", uid);
  const updates: Record<string, any> = {};

  // Remove expired gifted entries if any
  if (expiredIds.length > 0) {
    updates.gifted = activeGifted;
  }

  // Drain gifted first, then daily, then monthly
  let remaining = cost;

  let newGifted = [...activeGifted];
  if (remaining > 0 && totalGifted > 0) {
    // Drain from each gifted entry in order
    for (let i = newGifted.length - 1; i >= 0 && remaining > 0; i--) {
      const used = Math.min(newGifted[i].amount, remaining);
      newGifted[i] = { ...newGifted[i], amount: newGifted[i].amount - used };
      remaining -= used;
    }
    newGifted = newGifted.filter((g) => g.amount > 0);
    updates.gifted = newGifted;
  }

  const dailyUsed = Math.min(credits.daily, remaining);
  remaining -= dailyUsed;
  const newMonthly = credits.monthly - remaining;

  updates.daily = credits.daily - dailyUsed;
  updates.monthly = newMonthly;

  await updateDoc(creditsRef, updates);
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

/**
 * Gift a fixed number of credits to a user, with an optional expiry date.
 * The gifted block is appended to the `gifted` array on their credits doc.
 * Pass `expiresAt = null` for credits that never expire.
 */
export const giftCredits = async (uid: string, amount: number, expiresAt: Date | null): Promise<void> => {
  const creditsRef = doc(db, "user_credits", uid);
  const snap = await getDoc(creditsRef);
  if (!snap.exists()) {
    await initializeCredits(uid);
  }

  const giftEntry: GiftedCredit = {
    id: `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    amount,
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    grantedAt: serverTimestamp(),
  };

  await updateDoc(creditsRef, {
    gifted: arrayUnion(giftEntry),
  });
};

/**
 * Grant a user an unlimited-credits pass valid until `untilDate`.
 * Sets (or overwrites) `creditsUnlimitedUntil` on their credits doc.
 */
export const giftUnlimitedCredits = async (uid: string, untilDate: Date): Promise<void> => {
  const creditsRef = doc(db, "user_credits", uid);
  const snap = await getDoc(creditsRef);
  if (!snap.exists()) {
    await initializeCredits(uid);
  }

  await updateDoc(creditsRef, {
    creditsUnlimitedUntil: Timestamp.fromDate(untilDate),
  });
};
