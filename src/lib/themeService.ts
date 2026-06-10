import { db } from "./firebase";
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { ThemeDefinition } from "./themes";
import { adjustCredits, getCredits } from "./creditsService";
import { toast } from "sonner";

const THEMES_COLLECTION = "themes";

export const getAllDbThemes = async (): Promise<ThemeDefinition[]> => {
  try {
    const snap = await getDocs(collection(db, THEMES_COLLECTION));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThemeDefinition));
  } catch (error) {
    console.error("Failed to load db themes:", error);
    return [];
  }
};

export const createDbTheme = async (theme: ThemeDefinition, adminId: string): Promise<void> => {
  const ref = doc(db, THEMES_COLLECTION, theme.id);
  await setDoc(ref, {
    ...theme,
    createdAt: serverTimestamp(),
    createdBy: adminId
  });
};

export const updateDbTheme = async (themeId: string, updates: Partial<ThemeDefinition>): Promise<void> => {
  const ref = doc(db, THEMES_COLLECTION, themeId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteDbTheme = async (themeId: string): Promise<void> => {
  const ref = doc(db, THEMES_COLLECTION, themeId);
  await deleteDoc(ref);
};

export const unlockTheme = async (userId: string, themeId: string, price: number): Promise<boolean> => {
  try {
    if (price > 0) {
      const credits = await getCredits(userId);
      const activeGifted = (credits.gifted ?? []).filter(
        (g) => g.expiresAt === null || !g.expiresAt || (g.expiresAt?.toMillis?.() ?? Infinity) > Date.now()
      );
      const totalGifted = activeGifted.reduce((sum, g) => sum + g.amount, 0);
      const totalAvailable = totalGifted + credits.daily + credits.monthly;

      if (totalAvailable < price && !credits.creditsUnlimitedUntil) {
        toast.error("Insufficient credits to unlock this theme.");
        return false;
      }

      await adjustCredits(userId, { daily: -price }); // Simplification for specific price deduction
    }
    
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      unlockedThemes: arrayUnion(themeId)
    });
    
    toast.success("Theme unlocked successfully!");
    return true;
  } catch (error) {
    console.error("Error unlocking theme:", error);
    toast.error("An error occurred while unlocking the theme.");
    return false;
  }
};

export const adminGrantTheme = async (userId: string, themeId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      unlockedThemes: arrayUnion(themeId)
    });
  } catch (error) {
    console.error("Error granting theme:", error);
    throw error;
  }
};

const COMMUNITY_THEMES_COLLECTION = "community_themes";

export interface CommunityTheme {
  id: string;
  name: string;
  description: string;
  vars: Record<string, string>;
  authorId: string;
  authorUsername: string;
  likes: number;
  likedBy: string[];
  installs: number;
  isApproved: boolean;
  createdAt: any;
  updatedAt?: any;
}

export const publishCommunityTheme = async (themeData: Omit<CommunityTheme, "id" | "likes" | "likedBy" | "installs" | "isApproved" | "createdAt">): Promise<void> => {
  const newRef = doc(collection(db, COMMUNITY_THEMES_COLLECTION));
  await setDoc(newRef, {
    ...themeData,
    id: newRef.id,
    likes: 0,
    likedBy: [],
    installs: 0,
    isApproved: false, // requires admin approval
    createdAt: serverTimestamp(),
  });
  toast.success("Theme submitted for approval!");
};

export const getCommunityThemes = async (): Promise<CommunityTheme[]> => {
  try {
    const snap = await getDocs(collection(db, COMMUNITY_THEMES_COLLECTION));
    const themes = snap.docs.map(doc => ({ ...doc.data() } as CommunityTheme));
    return themes.filter(t => t.isApproved);
  } catch (error) {
    console.error("Failed to load community themes:", error);
    return [];
  }
};

export const getPendingThemes = async (): Promise<CommunityTheme[]> => {
  try {
    const snap = await getDocs(collection(db, COMMUNITY_THEMES_COLLECTION));
    const themes = snap.docs.map(doc => ({ ...doc.data() } as CommunityTheme));
    return themes.filter(t => !t.isApproved);
  } catch (error) {
    console.error("Failed to load pending themes:", error);
    return [];
  }
};

export const approveCommunityTheme = async (themeId: string): Promise<void> => {
  const ref = doc(db, COMMUNITY_THEMES_COLLECTION, themeId);
  await updateDoc(ref, {
    isApproved: true,
    updatedAt: serverTimestamp()
  });
};

export const rejectCommunityTheme = async (themeId: string): Promise<void> => {
  const ref = doc(db, COMMUNITY_THEMES_COLLECTION, themeId);
  await deleteDoc(ref);
};

export const toggleThemeLike = async (themeId: string, userId: string, currentlyLiked: boolean): Promise<void> => {
  const ref = doc(db, COMMUNITY_THEMES_COLLECTION, themeId);
  if (currentlyLiked) {
    await updateDoc(ref, {
      likedBy: arrayRemove(userId),
      likes: increment(-1)
    });
  } else {
    await updateDoc(ref, {
      likedBy: arrayUnion(userId),
      likes: increment(1)
    });
  }
};

export const incrementThemeInstalls = async (themeId: string): Promise<void> => {
  const ref = doc(db, COMMUNITY_THEMES_COLLECTION, themeId);
  await updateDoc(ref, { installs: increment(1) });
};
