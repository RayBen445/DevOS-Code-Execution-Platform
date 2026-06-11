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
  orderBy,
  limit,
} from "firebase/firestore";
import { Project, UsernameChangeRequest } from "../types";
import { initializeCredits } from "./creditsService";
import { DEFAULT_USER_AVATAR } from "./avatars";
import { getOrCreateReferralCode, processReferral } from "./referralService";
import { joinOfficialCommunities } from "./communityService";
import { joinOfficialOrgs } from "./orgService";
import { buildPortfolioUrl, RESERVED_SUBDOMAINS } from "./brand";

const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL || "oladoyeheritage445@gmail.com";

/**
 * Set this flag BEFORE calling signUpWithEmail so that initializeUser
 * skips its own profile-creation logic and lets registerUserProfile handle it,
 * preventing the race condition that sets the username to the email prefix.
 */
let _skipNextInitialize = false;
export const skipNextInitialize = () => { _skipNextInitialize = true; };

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
    bio: "Building the future with DevOS by KONTYRA.",
    role: isAdmin ? "admin" : "user",
    subdomain: buildPortfolioUrl(profile.username).replace(/^https?:\/\//, ""),
    updatedAt: serverTimestamp(),
  });

  await setDoc(settingsRef, {
    username: profile.username,
    displayName: profile.fullName || profile.username,
    fullName: profile.fullName,
    avatarUrl: avatar,
    bio: "Building the future with DevOS by KONTYRA.",
    updatedAt: serverTimestamp(),
  });

  await initializeCredits(user.uid);
  await createPortfolioProject(user.uid, profile.username).catch((err) => {
    console.error("createPortfolioProject failed (non-fatal):", err);
  });

  // Auto-join all official communities and orgs
  await joinOfficialCommunities(user.uid).catch(() => {});
  await joinOfficialOrgs(user.uid, profile.username).catch(() => {});

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
    } catch (err) {
      // referral processing is best-effort
    }
    sessionStorage.removeItem("devos_pending_ref");
  }
};

export const initializeUser = async (user: any) => {
  if (!user) return;

  // If a sign-up registration is in progress, let registerUserProfile handle
  // profile creation to avoid the race condition that sets username to email prefix.
  if (_skipNextInitialize) {
    _skipNextInitialize = false;
    return;
  }

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
      bio: "Building the future with DevOS by KONTYRA.",
      role: isAdmin ? "admin" : "user",
      subdomain: buildPortfolioUrl(username).replace(/^https?:\/\//, ""),
      updatedAt: serverTimestamp(),
    });

    // Create private settings
    await setDoc(settingsRef, {
      username,
      displayName: user.displayName || username,
      avatarUrl: avatar,
      bio: "Building the future with DevOS by KONTYRA.",
      updatedAt: serverTimestamp(),
    });

    // Initialize credits
    await initializeCredits(user.uid);

    // Create initial portfolio project
    await createPortfolioProject(user.uid, username);

    // Auto-join all official communities and orgs
    await joinOfficialCommunities(user.uid).catch(() => {});
    await joinOfficialOrgs(user.uid, username).catch(() => {});

    // Generate referral code for this new user
    await getOrCreateReferralCode(user.uid).catch(() => {});

    // Process any pending referral stored when the user visited via a ?ref= link
    const pendingRef = sessionStorage.getItem("devos_pending_ref");
    if (pendingRef) {
      try {
        await processReferral(pendingRef, user.uid);
      } catch (err) {
        // best-effort
      }
      sessionStorage.removeItem("devos_pending_ref");
    }
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
    } catch (err) {
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
  const lower = username.toLowerCase();

  if (RESERVED_SUBDOMAINS.has(lower)) return false;

  // Check the reserved list first. Silently skip if the collection is
  // unreachable (e.g. rules not yet deployed in this environment).
  try {
    const reservedSnap = await getDoc(doc(db, "reservedUsernames", lower));
    if (reservedSnap.exists()) return false;
  } catch {
    // reserved-names check unavailable – fall through to user check
  }

  // Check actual registered users (case-insensitive: usernames are stored lowercase)
  const q = query(collection(db, "users"), where("username", "==", lower));
  const snap = await getDocs(q);
  return snap.empty;
};

export const createPortfolioProject = async (uid: string, username: string): Promise<string> => {
  const projectData = {
    name: "My Portfolio",
    description: "Your professional developer portfolio, built with DevOS.",
    ownerId: uid,
    ownerUsername: username,
    ownerType: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    collaborators: [],
    isPublic: true,
    isTemplate: false,
    forksCount: 0,
    views: 0,
    isSystem: true,
    systemType: "portfolio",
    isEditable: true,
    isDeletable: false,
    deployStatus: "success",
    lastDeployedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "projects"), projectData);
  const filesRef = collection(db, "projects", docRef.id, "files");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${username}'s Portfolio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>Hello, I'm ${username}</h1>
    <p>Welcome to my professional portfolio.</p>
    <div class="card">
      <h2>About Me</h2>
      <p>I am a developer building awesome things with DevOS.</p>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`;

  const cssContent = `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f111a;
  color: #ffffff;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
.container {
  max-width: 800px;
  padding: 2rem;
}
h1 { color: #3b82f6; }
.card {
  background: rgba(255,255,255,0.05);
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 2rem;
}`;

  const jsContent = `console.log("Welcome to my portfolio!");`;

  await Promise.all([
    addDoc(filesRef, { projectId: docRef.id, name: "index.html", path: "index.html", content: htmlContent, language: "html", updatedAt: serverTimestamp() }),
    addDoc(filesRef, { projectId: docRef.id, name: "style.css", path: "style.css", content: cssContent, language: "css", updatedAt: serverTimestamp() }),
    addDoc(filesRef, { projectId: docRef.id, name: "script.js", path: "script.js", content: jsContent, language: "javascript", updatedAt: serverTimestamp() })
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

  // Only increment monthlyStreak once per month when the 20-day threshold is first reached.
  // Track the month in which the award was last given to prevent repeated increments.
  const lastAwardMonth: string | undefined = data.lastMonthlyStreakAwardMonth;
  const thresholdReached = activeDays.length >= 20;
  const alreadyAwardedThisMonth = lastAwardMonth === currentMonth;
  const newMonthly = thresholdReached && !alreadyAwardedThisMonth
    ? (data.monthlyStreak ?? 0) + 1
    : data.monthlyStreak ?? 0;
  const newLastAwardMonth = thresholdReached ? currentMonth : lastAwardMonth;

  await updateDoc(userRef, {
    dailyStreak: newDaily,
    monthlyStreak: newMonthly,
    lastActiveDate: todayStr,
    lastActiveMonth: currentMonth,
    activeDaysThisMonth: activeDays,
    ...(newLastAwardMonth !== undefined ? { lastMonthlyStreakAwardMonth: newLastAwardMonth } : {}),
  });
};

/** Fetch user settings doc (user_settings/{uid}). Returns null if not found. */
export const getUserSettings = async (uid: string) => {
  const snap = await getDoc(doc(db, "user_settings", uid));
  return snap.exists() ? (snap.data() as import("../types").UserSettings) : null;
};

/** Admin: change the username of any user. Updates both users and user_settings docs. */
export const adminChangeUsername = async (targetUid: string, newUsername: string): Promise<void> => {
  const lower = newUsername.trim().toLowerCase();
  await updateDoc(doc(db, "users", targetUid), { username: lower, updatedAt: serverTimestamp() });
  await updateDoc(doc(db, "user_settings", targetUid), { username: lower, updatedAt: serverTimestamp() });
};

export const banUser = async (uid: string): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { status: "banned" });
};

/** Suspend a user — temporarily blocked; can be reinstated. */
export const suspendUser = async (uid: string): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { status: "suspended" });
};

/** Reinstate a user — removes ban/suspension. */
export const reinstateUser = async (uid: string): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { status: "active" });
};

/** Deactivate the caller's own account — they are signed out and cannot log back in. */
export const deactivateAccount = async (uid: string): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { status: "deactivated" });
};

/**
 * Submit an account deletion request.
 * The actual deletion is handled manually by the admin via email.
 * Creates a doc in `deletion_requests/{uid}` that admins can review.
 */
export const requestAccountDeletion = async (
  uid: string,
  email: string,
  reason?: string
): Promise<void> => {
  await setDoc(doc(db, "deletion_requests", uid), {
    userId: uid,
    email,
    reason: reason?.trim() || "",
    requestedAt: serverTimestamp(),
    status: "pending",
  });
};

// ─── Username Change Requests ─────────────────────────────────────────────────

/** Submit a username change request. A user may only have one pending request. */
export const requestUsernameChange = async (
  uid: string,
  currentUsername: string,
  requestedUsername: string,
  reason?: string
): Promise<string> => {
  const ref = await addDoc(collection(db, "username_change_requests"), {
    uid,
    currentUsername,
    requestedUsername: requestedUsername.toLowerCase().trim(),
    reason: reason?.trim() || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/** Get the most recent username change request for the current user. */
export const getUserOwnUsernameRequest = async (uid: string): Promise<UsernameChangeRequest | null> => {
  const q = query(
    collection(db, "username_change_requests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as UsernameChangeRequest;
};

/** Admin: get username change requests (optionally filtered by status). */
export const getUsernameChangeRequests = async (
  statusFilter?: "pending" | "approved" | "rejected"
): Promise<UsernameChangeRequest[]> => {
  const constraints: any[] = [orderBy("createdAt", "desc"), limit(200)];
  if (statusFilter) constraints.unshift(where("status", "==", statusFilter));
  const snap = await getDocs(query(collection(db, "username_change_requests"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UsernameChangeRequest));
};

/** Admin: approve or reject a username change request. */
export const resolveUsernameChangeRequest = async (
  requestId: string,
  action: "approved" | "rejected",
  adminUid: string,
  rejectionReason?: string
): Promise<void> => {
  await updateDoc(doc(db, "username_change_requests", requestId), {
    status: action,
    resolvedAt: serverTimestamp(),
    resolvedBy: adminUid,
    ...(rejectionReason ? { rejectionReason } : {}),
  });
};

/** Admin: toggle the official/verified status of a user. */
export const setUserOfficial = async (uid: string, isOfficial: boolean): Promise<void> => {
  await updateDoc(doc(db, "users", uid), { isOfficial });
  // Also keep user_settings in sync so posts stamped at creation reflect the change
  await updateDoc(doc(db, "user_settings", uid), { isOfficial }).catch(() => {});
};
