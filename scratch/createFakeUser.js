import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

// Load config
const configPath = './firebase-applet-config.json';
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const fakeUserId = "fake-user-" + Date.now();
  console.log("Creating fake user:", fakeUserId);

  await setDoc(doc(db, "users", fakeUserId), {
    uid: fakeUserId,
    email: "fake.user@example.com",
    displayName: "Fake User",
    username: "fakeuser_" + Math.floor(Math.random() * 1000),
    avatar: "",
    bio: "I am a test user.",
    role: "user",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    streak: 0,
    bestStreak: 0,
    projectCount: 0,
    isOfficial: false
  });
  
  console.log("Fake user created successfully in Firestore.");
  process.exit(0);
}

run().catch(console.error);
