import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

// Read the config
const configPath = "./firebase-applet-config.json";
const configStr = fs.readFileSync(configPath, "utf-8");
const firebaseConfig = JSON.parse(configStr);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

import { THEMES } from "../src/lib/themes";

const ADMIN_ID = "admin_devos"; // we can use a system string like "system" or the admin's actual UID. I'll just use "system"

async function seed() {
  console.log("Seeding themes...");
  for (const theme of THEMES) {
    if (theme.id === "system") continue;
    
    // Check if exists
    const themeDocId = `theme-${theme.id}`;
    const ref = doc(db, "templates", themeDocId);
    
    console.log(`Processing theme: ${theme.label}`);
    
    const themeConfig = {
      primaryColor: theme.vars['--accent'] || '#3b82f6',
      backgroundColor: theme.vars['--bg-base'] || '#0B0F17',
      cardColor: theme.vars['--bg-surface'] || '#111827',
      textColor: theme.vars['--text-primary'] || '#ffffff',
      cssVars: theme.vars,
      darkMode: theme.id !== 'light'
    };

    const templateData = {
      id: themeDocId,
      name: theme.label,
      description: theme.description,
      files: [],
      tags: ["theme", "ui", "design"],
      downloads: 0,
      likes: 0,
      likedBy: [],
      authorId: ADMIN_ID,
      authorUsername: "DevOS",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isOfficial: true,
      type: "theme",
      themeConfig,
      price: theme.price || 0,
      isPremium: theme.isPremium || false,
      isApproved: true
    };
    
    await setDoc(ref, templateData, { merge: true });
    console.log(`Saved theme: ${theme.label}`);
  }
  
  console.log("Done seeding themes!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding themes:", err);
  process.exit(1);
});
