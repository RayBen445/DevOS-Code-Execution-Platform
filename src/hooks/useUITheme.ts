import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UITheme, applyTheme } from "../lib/themes";

const STORAGE_KEY = "devos_ui_theme";
const CUSTOM_STORAGE_KEY = "devos_custom_theme";

// Apply saved theme synchronously before the first React render so there is
// no flash of the default dark background when a non-dark theme is active.
(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) as UITheme | null;
  const savedCustom = localStorage.getItem(CUSTOM_STORAGE_KEY);
  const customVars = savedCustom ? JSON.parse(savedCustom) : undefined;
  applyTheme(saved ?? "system", customVars);
})();

/** Reads, persists, and applies the user's chosen UI theme. */
export function useUITheme() {
  const [user] = useAuthState(auth);
  const [theme, setThemeState] = useState<UITheme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as UITheme) ?? "system";
  });
  const [customTheme, setCustomThemeState] = useState<Record<string, string> | null>(() => {
    const saved = localStorage.getItem(CUSTOM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // Sync from Firestore once user is known
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "user_settings", user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const firestoreTheme = data?.preferences?.uiTheme as UITheme | undefined;
      const firestoreCustom = data?.preferences?.customTheme as Record<string, string> | undefined;
      
      let changed = false;
      if (firestoreTheme && firestoreTheme !== theme) {
        setThemeState(firestoreTheme);
        localStorage.setItem(STORAGE_KEY, firestoreTheme);
        changed = true;
      }
      if (firestoreCustom && JSON.stringify(firestoreCustom) !== JSON.stringify(customTheme)) {
        setCustomThemeState(firestoreCustom);
        localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(firestoreCustom));
        changed = true;
      }
      if (changed) {
        applyTheme(firestoreTheme || theme, firestoreCustom || customTheme || undefined);
      }
    }).catch(() => {});
  }, [user?.uid]);

  // If user selected system theme, react to OS color-scheme changes.
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("system");
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [theme]);

  const changeTheme = async (newTheme: UITheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme, customTheme || undefined);
    localStorage.setItem(STORAGE_KEY, newTheme);
    if (user) {
      try {
        await updateDoc(doc(db, "user_settings", user.uid), {
          "preferences.uiTheme": newTheme,
        });
      } catch { /* best-effort */ }
    }
  };

  const setCustomTheme = async (newCustom: Record<string, string>) => {
    setCustomThemeState(newCustom);
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(newCustom));
    if (theme === "custom") {
      applyTheme("custom", newCustom);
    }
    if (user) {
      try {
        await updateDoc(doc(db, "user_settings", user.uid), {
          "preferences.customTheme": newCustom,
        });
      } catch { /* best-effort */ }
    }
  };

  return { theme, changeTheme, customTheme, setCustomTheme };
}
