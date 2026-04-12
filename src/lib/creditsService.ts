import { db, auth } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, arrayUnion, runTransaction, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { Credits, GiftedCredit, CreditTransactionType, CreditTransaction } from "../types";

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

export interface MaintenanceConfig {
  maintenanceMode: boolean;
  maintenanceBanner?: string; // Optional message shown to users
  maintenancePages?: string[]; // List of route prefixes under per-page maintenance
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

/** Fetch the most recent credit transactions for a user (newest first) */
export const getCreditTransactions = async (uid: string, maxCount = 50): Promise<CreditTransaction[]> => {
  const q = query(
    collection(db, "user_credits", uid, "transactions"),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreditTransaction));
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

  const cost = config.chargePerAction > 0
    ? config.chargePerAction
    : (config.actionCosts?.[action] ?? CREDIT_COSTS[action]);

  const creditsRef = doc(db, "user_credits", uid);

  // Wrap the balance check and deduction in a transaction to prevent race conditions
  // (concurrent calls cannot race and over-spend or clobber each other's writes).
  const success = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(creditsRef);
    if (!snap.exists()) {
      return false;
    }

    const credits = snap.data() as Credits;

    // Check unlimited pass
    if (credits.creditsUnlimitedUntil) {
      const unlimitedUntilMs = credits.creditsUnlimitedUntil?.toMillis?.() ?? 0;
      if (unlimitedUntilMs > Date.now()) return true;
    }

    // Prune expired gifted credits, compute available gifted amount
    const now = Date.now();
    const activeGifted = (credits.gifted ?? []).filter(
      (g) => g.expiresAt === null || !g.expiresAt || (g.expiresAt?.toMillis?.() ?? Infinity) > now
    );
    const totalGifted = activeGifted.reduce((sum, g) => sum + g.amount, 0);

    if (totalGifted + credits.daily + credits.monthly < cost) {
      return false;
    }

    const updates: Record<string, any> = {};

    // Drain gifted first (FIFO — oldest entry first, preserving insertion order)
    let remaining = cost;
    let newGifted = [...activeGifted];
    if (remaining > 0 && totalGifted > 0) {
      for (let i = 0; i < newGifted.length && remaining > 0; i++) {
        const used = Math.min(newGifted[i].amount, remaining);
        newGifted[i] = { ...newGifted[i], amount: newGifted[i].amount - used };
        remaining -= used;
      }
      newGifted = newGifted.filter((g) => g.amount > 0);
      updates.gifted = newGifted;
    }

    const dailyUsed = Math.min(credits.daily, remaining);
    remaining -= dailyUsed;
    const monthlyUsed = remaining;

    updates.daily = credits.daily - dailyUsed;
    updates.monthly = credits.monthly - monthlyUsed;

    transaction.update(creditsRef, updates);
    return true;
  });

  // Log transaction outside the Firestore transaction (non-critical)
  if (success) {
    logCreditTransaction(uid, "deduct", -cost, action);
  }
  return success;
};

/** Write a single transaction record to user_credits/{uid}/transactions (exported for use by other services) */
export async function logCreditTransaction(
  uid: string,
  type: CreditTransactionType,
  delta: number,
  label: string
): Promise<void> {
  try {
    await addDoc(collection(db, "user_credits", uid, "transactions"), {
      type,
      delta,
      label,
      createdAt: serverTimestamp(),
    });
  } catch {
    // non-critical — never block the caller
  }
}

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
  const totalDelta = (delta.daily ?? 0) + (delta.monthly ?? 0);
  if (totalDelta !== 0) {
    logCreditTransaction(uid, "adjust", totalDelta, `admin adjustment (daily:${delta.daily ?? 0} monthly:${delta.monthly ?? 0})`);
  }
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
  logCreditTransaction(uid, "gift", amount, `gift${expiresAt ? ` (expires ${expiresAt.toLocaleDateString()})` : " (no expiry)"}`);
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
  logCreditTransaction(uid, "unlimited_grant", 0, `unlimited credits until ${untilDate.toLocaleDateString()}`);
};

// ── Maintenance mode ────────────────────────────────────────────────────────

const MAINTENANCE_DOC = "maintenance";

/** Read current maintenance state from system_config/maintenance */
export const getMaintenanceConfig = async (): Promise<MaintenanceConfig> => {
  const snap = await getDoc(doc(db, "system_config", MAINTENANCE_DOC));
  if (!snap.exists()) return { maintenanceMode: false, maintenanceBanner: "", maintenancePages: [] };
  const d = snap.data();
  return {
    maintenanceMode: d.maintenanceMode ?? false,
    maintenanceBanner: d.maintenanceBanner ?? "",
    maintenancePages: d.maintenancePages ?? [],
  };
};

/** Toggle maintenance mode on or off (admin only — Firestore rule enforces this) */
export const saveMaintenanceConfig = async (config: MaintenanceConfig): Promise<void> => {
  await setDoc(doc(db, "system_config", MAINTENANCE_DOC), {
    maintenanceMode: config.maintenanceMode,
    maintenanceBanner: config.maintenanceBanner ?? "",
    maintenancePages: config.maintenancePages ?? [],
  });
};

// ─── Site / Branding Config ──────────────────────────────────────────────────

const SITE_DOC = "site";

export interface SiteConfig {
  platformName: string;
  tagline: string;
  contactEmail: string;
  githubUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  footerCredit: string;
  allowVoiceCalls: boolean;
}

export const SITE_CONFIG_DEFAULTS: SiteConfig = {
  platformName: "DevOS",
  tagline: "The cloud IDE built for builders who want to ship faster.",
  contactEmail: "info@devos.zone.id",
  githubUrl: "https://github.com/devos",
  twitterUrl: "https://twitter.com/devos",
  websiteUrl: "https://devos.app",
  footerCredit: "Built by Cool Shot Systems · TVN",
  allowVoiceCalls: true,
};

/** Read site branding config from system_config/site */
export const getSiteConfig = async (): Promise<SiteConfig> => {
  const snap = await getDoc(doc(db, "system_config", SITE_DOC));
  if (!snap.exists()) return SITE_CONFIG_DEFAULTS;
  const d = snap.data();
  return {
    platformName: d.platformName ?? SITE_CONFIG_DEFAULTS.platformName,
    tagline: d.tagline ?? SITE_CONFIG_DEFAULTS.tagline,
    contactEmail: d.contactEmail ?? SITE_CONFIG_DEFAULTS.contactEmail,
    githubUrl: d.githubUrl ?? SITE_CONFIG_DEFAULTS.githubUrl,
    twitterUrl: d.twitterUrl ?? SITE_CONFIG_DEFAULTS.twitterUrl,
    websiteUrl: d.websiteUrl ?? SITE_CONFIG_DEFAULTS.websiteUrl,
    footerCredit: d.footerCredit ?? SITE_CONFIG_DEFAULTS.footerCredit,
    allowVoiceCalls: d.allowVoiceCalls ?? SITE_CONFIG_DEFAULTS.allowVoiceCalls,
  };
};

/** Persist site branding config (admin only) */
export const saveSiteConfig = async (config: SiteConfig): Promise<void> => {
  await setDoc(doc(db, "system_config", SITE_DOC), { ...config });
};
