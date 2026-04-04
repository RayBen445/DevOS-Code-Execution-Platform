import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UITheme, applyTheme } from "../lib/themes";

const STORAGE_KEY = "devos_ui_theme";

/** Reads, persists, and applies the user's chosen UI theme. */
export function useUITheme() {
  const [user] = useAuthState(auth);
  const [theme, setThemeState] = useState<UITheme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as UITheme) ?? "dark";
  });

  // Apply saved theme immediately on mount (before Firestore loads)
  useEffect(() => {
    applyTheme(theme);
  }, []);

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
