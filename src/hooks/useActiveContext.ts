/**
 * useActiveContext.ts
 *
 * Tracks the currently active "context" in DevOS:
 *
 *   - { type: "user",  id: userId }   → personal IDE, profile, etc.
 *   - { type: "org",   id: orgId }    → org projects, events, settings
 *
 * The context is persisted to localStorage so it survives page refreshes,
 * but is automatically reset to "user" whenever the active auth user changes.
 *
 * Usage:
 *   const { context, setUserContext, setOrgContext } = useActiveContext();
 */

import { useState, useEffect, useCallback } from "react";
import { auth } from "../lib/firebase";

const LS_KEY = "devos_active_context";

export type ActiveContext =
  | { type: "user"; id: string }
  | { type: "org"; id: string; slug: string; name: string };

function readContext(): ActiveContext | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeContext(ctx: ActiveContext): void {
  localStorage.setItem(LS_KEY, JSON.stringify(ctx));
}

export function useActiveContext() {
  const [context, setContext] = useState<ActiveContext | null>(() => readContext());

  // When auth state changes, reset context to user
  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      if (!user) {
        localStorage.removeItem(LS_KEY);
        setContext(null);
        return;
      }
      const stored = readContext();
      // If no stored context or the stored context is a user context for a
      // different uid (e.g. after account switch), reset to current user.
      if (!stored || (stored.type === "user" && stored.id !== user.uid)) {
        const defaultCtx: ActiveContext = { type: "user", id: user.uid };
        writeContext(defaultCtx);
        setContext(defaultCtx);
      } else {
        setContext(stored);
      }
    });
  }, []);

  const setUserContext = useCallback((userId: string) => {
    const ctx: ActiveContext = { type: "user", id: userId };
    writeContext(ctx);
    setContext(ctx);
  }, []);

  const setOrgContext = useCallback(
    (orgId: string, slug: string, name: string) => {
      const ctx: ActiveContext = { type: "org", id: orgId, slug, name };
      writeContext(ctx);
      setContext(ctx);
    },
    []
  );

  const clearContext = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setContext(null);
  }, []);

  return { context, setUserContext, setOrgContext, clearContext };
}
