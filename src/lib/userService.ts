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
  serverTimestamp 
} from "firebase/firestore";
import { Project } from "../types";
import { initializeCredits } from "./creditsService";

const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL || "oladoyeheritage445@gmail.com";

export const initializeUser = async (user: any) => {
  if (!user) return;

  const settingsRef = doc(db, "user_settings", user.uid);
  const userRef = doc(db, "users", user.uid);
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    // Create initial settings
    const username = user.email?.split("@")[0] || `user_${user.uid.slice(0, 5)}`;
    const isAdmin = user.email === ADMIN_EMAIL;
    
    // Create public user profile
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      username,
      displayName: user.displayName || username,
      avatarUrl: user.photoURL || "",
      bio: "Building the future on DevOS.",
      role: isAdmin ? "admin" : "user",
      updatedAt: serverTimestamp(),
    });

    // Create private settings
    await setDoc(settingsRef, {
      username,
      displayName: user.displayName || username,
      avatarUrl: user.photoURL || "",
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
        const { updateDoc } = await import("firebase/firestore");
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
};

const createPortfolioProject = async (uid: string, username: string) => {
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
    isPublic: false, // Initially private as requested
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

  // Initialize files
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
