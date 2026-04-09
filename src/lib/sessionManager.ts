/**
 * sessionManager.ts
 *
 * Multi-account session management for DevOS.
 *
 * Firebase Auth only supports one active user per app instance, but it
 * provides `updateCurrentUser(auth, user)` which lets us swap the active
 * user object as long as both users were authenticated in the same browser
 * session.
 *
 * Strategy:
 *  - Keep an in-memory Map<uid, User> of every User that has signed in.
 *  - On account switch: call `updateCurrentUser(auth, cachedUser)`.
 *  - On logout of one account: remove it from the map AND from localStorage.
 *
 * localStorage keys (matching what Navbar already uses):
 *  - devos_saved_accounts  – JSON array of serialised account metadata
 */

import { auth } from "./firebase";
import { updateCurrentUser, User } from "firebase/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SavedAccount {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  email: string;
}

// ── In-memory cache ───────────────────────────────────────────────────────────

/** uid → User (populated whenever a sign-in happens in this tab) */
const _userCache = new Map<string, User>();

/** Register a User object in the in-memory cache. Call this after every sign-in. */
export function registerUser(user: User): void {
  _userCache.set(user.uid, user);
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_KEY = "devos_saved_accounts";

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function upsertSavedAccount(account: SavedAccount): void {
  const existing = getSavedAccounts().filter((a) => a.uid !== account.uid);
  localStorage.setItem(LS_KEY, JSON.stringify([account, ...existing]));
}

export function removeSavedAccount(uid: string): void {
  const updated = getSavedAccounts().filter((a) => a.uid !== uid);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  _userCache.delete(uid);
}

// ── Account switching ─────────────────────────────────────────────────────────

export type SwitchResult =
  | { success: true }
  | { success: false; reason: "not_in_cache" | "same_user" | "error"; message?: string };

/**
 * Switch the active Firebase Auth user to the given uid without logging out.
 *
 * Returns `{ success: false, reason: "not_in_cache" }` when the User object
 * is no longer available (e.g. different tab / page refresh).  In that case
 * the caller should prompt the user to sign in again.
 */
export async function switchToAccount(uid: string): Promise<SwitchResult> {
  const current = auth.currentUser;
  if (current?.uid === uid) return { success: false, reason: "same_user" };

  const cached = _userCache.get(uid);
  if (!cached) return { success: false, reason: "not_in_cache" };

  try {
    await updateCurrentUser(auth, cached);
    return { success: true };
  } catch (err: any) {
    return { success: false, reason: "error", message: err?.message };
  }
}

// ── Per-account logout ────────────────────────────────────────────────────────

/**
 * Log out a specific account without touching other saved sessions.
 *
 * - If the account being removed is currently active, Firebase is signed out
 *   and we try to automatically switch to the next available cached account.
 * - If no other cached account is available, Firebase signs out fully.
 */
export async function logoutAccount(uid: string): Promise<void> {
  removeSavedAccount(uid);

  if (auth.currentUser?.uid !== uid) return; // not active — nothing else to do

  // Try to switch to the first remaining cached account
  const remaining = getSavedAccounts();
  for (const acc of remaining) {
    const result = await switchToAccount(acc.uid);
    if (result.success) return;
  }

  // No other session available — full sign-out
  await auth.signOut();
}
