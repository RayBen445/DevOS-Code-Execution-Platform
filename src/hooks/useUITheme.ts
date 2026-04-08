import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UITheme, applyTheme } from "../lib/themes";

const STORAGE_KEY = "devos_ui_theme";

// Apply saved theme synchronously before the first React render so there is
// no flash of the default dark background when a non-dark theme is active.
(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) as UITheme | null;
  applyTheme(saved ?? "system");
})();

/** Reads, persists, and applies the user's chosen UI theme. */
export function useUITheme() {
  const [user] = useAuthState(auth);
  const [theme, setThemeState] = useState<UITheme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as UITheme) ?? "system";
  });

  // Sync from Firestore once user is known
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "user_settings", user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const firestoreTheme = snap.data()?.preferences?.uiTheme as UITheme | undefined;
      if (firestoreTheme && firestoreTheme !== theme) {
        setThemeState(firestoreTheme);
        applyTheme(firestoreTheme);
        localStorage.setItem(STORAGE_KEY, firestoreTheme);
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
    applyTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    if (user) {
      try {
        await updateDoc(doc(db, "user_settings", user.uid), {
          "preferences.uiTheme": newTheme,
        });
      } catch { /* best-effort */ }
    }
  };

  return { theme, changeTheme };
}
