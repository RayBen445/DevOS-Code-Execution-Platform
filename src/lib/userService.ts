import { db, auth } from "./firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Project } from "../types";
import { initializeCredits } from "./creditsService";
import { DEFAULT_USER_AVATAR } from "./avatars";
import { getOrCreateReferralCode, processReferral } from "./referralService";

const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL || "oladoyeheritage445@gmail.com";

/**
 * Called immediately after email sign-up to persist fullName and username
 * chosen by the user in the registration form.
 * Optionally processes a referral code stored in sessionStorage.
 */
export const registerUserProfile = async (
  user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null },
  profile: { fullName: string; username: string }
) => {
  const isAdmin = user.email === ADMIN_EMAIL;
  const userRef = doc(db, "users", user.uid);
  const settingsRef = doc(db, "user_settings", user.uid);
  const avatar = user.photoURL || DEFAULT_USER_AVATAR;

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email || "",
    username: profile.username,
    displayName: profile.fullName || profile.username,
    fullName: profile.fullName,
    avatarUrl: avatar,
    bio: "Building the future on DevOS.",
    role: isAdmin ? "admin" : "user",
    updatedAt: serverTimestamp(),
  });

  await setDoc(settingsRef, {
    username: profile.username,
    displayName: profile.fullName || profile.username,
    fullName: profile.fullName,
    avatarUrl: avatar,
    bio: "Building the future on DevOS.",
    updatedAt: serverTimestamp(),
  });

  await initializeCredits(user.uid);
  await createPortfolioProject(user.uid, profile.username);

  // Generate referral code for the new user
  await getOrCreateReferralCode(user.uid).catch(() => {});

  // Process any pending referral (from ?ref= in the URL at time of visit)
  const pendingRef = sessionStorage.getItem("devos_pending_ref");
  if (pendingRef) {
    try {
      const rewarded = await processReferral(pendingRef, user.uid);
      if (rewarded) {
        // toast is not available here; caller can react to the promise resolving
      }
    } catch (_) {
      // referral processing is best-effort
    }
    sessionStorage.removeItem("devos_pending_ref");
  }
};

export const initializeUser = async (user: any) => {
  if (!user) return;

  const settingsRef = doc(db, "user_settings", user.uid);
  const userRef = doc(db, "users", user.uid);
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    // Create initial settings
    const username = user.email?.split("@")[0] || `user_${user.uid.slice(0, 5)}`;
    const isAdmin = user.email === ADMIN_EMAIL;
    const avatar = user.photoURL || DEFAULT_USER_AVATAR;
    
    // Create public user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      username,
      displayName: user.displayName || username,
      avatarUrl: avatar,
      bio: "Building the future on DevOS.",
      role: isAdmin ? "admin" : "user",
      updatedAt: serverTimestamp(),
    });

    // Create private settings
    await setDoc(settingsRef, {
      username,
      displayName: user.displayName || username,
      avatarUrl: avatar,
      bio: "Building the future on DevOS.",
      updatedAt: serverTimestamp(),
    });

    // Initialize credits
    await initializeCredits(user.uid);

    // Create initial portfolio project
    await createPortfolioProject(user.uid, username);
  } else {
    // Ensure public profile exists
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const data = settingsSnap.data();
      const isAdmin = user.email === ADMIN_EMAIL;
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || "",
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        role: isAdmin ? "admin" : "user",
        updatedAt: serverTimestamp(),
      });
    } else {
      // Ensure admin role is set for existing admin user
      const userSnap2 = userSnap;
      const existingRole = userSnap2.data()?.role;
      if (user.email === ADMIN_EMAIL && existingRole !== "admin") {
        await updateDoc(userRef, { role: "admin" });
      }
    }

    // Initialize credits if missing
    try {
      await initializeCredits(user.uid);
    } catch (_) {
      // credits may already exist, ignore
    }
    // Even if settings exist, check if portfolio project exists
    const q = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid),
      where("isSystem", "==", true),
      where("systemType", "==", "portfolio")
    );
    const portfolioSnap = await getDocs(q);
    
    if (portfolioSnap.empty) {
      const username = settingsSnap.data().username || user.email?.split("@")[0];
      await createPortfolioProject(user.uid, username);
    }
  }

  // Ensure referral code exists for this user (fire-and-forget)
  getOrCreateReferralCode(user.uid).catch(() => {});
};

/**
 * Returns true when the given username is not yet taken in the `users`
 * collection. Used for real-time availability feedback during sign-up.
 */
export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  // Check the reserved list first (fast single-doc lookup)
  const reservedSnap = await getDoc(doc(db, "reservedUsernames", username.toLowerCase()));
  if (reservedSnap.exists()) return false;

  // Then check actual users
  const q = query(collection(db, "users"), where("username", "==", username));
  const snap = await getDocs(q);
  return snap.empty;
};

const createPortfolioProject = async (uid: string, username: string): Promise<string> => {
  const portfolioConfig = {
    bio: "I am a developer building awesome things with DevOS.",
    featuredProjects: [],
    links: [
      { platform: "github", url: "" },
      { platform: "twitter", url: "" },
      { platform: "linkedin", url: "" }
    ]
  };

  const layoutConfig = {
    sections: ["hero", "projects", "contact"]
  };

  const themeConfig = {
    primaryColor: "#3b82f6",
    fontFamily: "Inter",
    darkMode: true
  };

  const projectData = {
    name: "My Portfolio",
    description: "Your professional developer portfolio, managed by DevOS.",
    ownerId: uid,
    ownerUsername: username,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    collaborators: [],
    isPublic: false,
    isTemplate: false,
    forksCount: 0,
    views: 0,
    isSystem: true,
    systemType: "portfolio",
    isEditable: true,
    isDeletable: false,
    deployStatus: "idle",
    draft: {
      portfolio: portfolioConfig,
      layout: layoutConfig,
      theme: themeConfig
    },
    published: {
      portfolio: portfolioConfig,
      layout: layoutConfig,
      theme: themeConfig
    },
    lastDeployedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "projects"), projectData);

  const filesRef = collection(db, "projects", docRef.id, "files");

  await Promise.all([
    addDoc(filesRef, {
      projectId: docRef.id,
      name: "portfolio.json",
      path: "portfolio.json",
      content: JSON.stringify(portfolioConfig, null, 2),
      language: "json",
      updatedAt: serverTimestamp()
    }),
    addDoc(filesRef, {
      projectId: docRef.id,
      name: "layout.json",
      path: "layout.json",
      content: JSON.stringify(layoutConfig, null, 2),
      language: "json",
      updatedAt: serverTimestamp()
    }),
    addDoc(filesRef, {
      projectId: docRef.id,
      name: "theme.json",
      path: "theme.json",
      content: JSON.stringify(themeConfig, null, 2),
      language: "json",
      updatedAt: serverTimestamp()
    })
  ]);

  return docRef.id;
};

/**
 * Call once per user session / page-load to keep streak counters current.
 * - dailyStreak  increments when the user is active on a new calendar day;
 *                resets to 1 if they skipped a day.
 * - monthlyStreak increments when the user has been active on ≥20 distinct
 *                  days during the current calendar month.
 * Stores lastActiveDate as "YYYY-MM-DD" in the users doc.
 */
export const updateStreak = async (uid: string): Promise<void> => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const lastActive: string | undefined = data.lastActiveDate;

  if (lastActive === todayStr) return; // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const prevDaily: number = data.dailyStreak ?? 0;
  const newDaily = lastActive === yesterdayStr ? prevDaily + 1 : 1;

  // Monthly: count unique active days this month stored in activeDaysThisMonth[]
  const currentMonth = todayStr.slice(0, 7); // "YYYY-MM"
  const lastMonth: string | undefined = data.lastActiveMonth;
  let activeDays: string[] = data.activeDaysThisMonth ?? [];
  if (lastMonth !== currentMonth) activeDays = []; // new month → reset
  if (!activeDays.includes(todayStr)) activeDays = [...activeDays, todayStr];

  const newMonthly = activeDays.length >= 20
    ? (data.monthlyStreak ?? 0) + 1
    : data.monthlyStreak ?? 0;

  await updateDoc(userRef, {
    dailyStreak: newDaily,
    monthlyStreak: newMonthly,
    lastActiveDate: todayStr,
    lastActiveMonth: currentMonth,
    activeDaysThisMonth: activeDays,
  });
};
