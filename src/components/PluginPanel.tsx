import React, { useState } from "react";
import { db, auth } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  Puzzle,
  Database,
  HardDrive,
  Mail,
  Zap,
  Layers,
  Globe,
  Bell,
  ToggleLeft,
  ClipboardList,
  Check,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Info,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Project, PluginId, InstalledPlugin } from "../types";
import { toast } from "sonner";

// ── Plugin Definitions ───────────────────────────────────────────────────────

interface PluginDef {
  id: PluginId;
  name: string;
  description: string;
  category: string;
  icon: React.ElementType;
  color: string;
  phase: number;
  freeTier: string;
  creditCost: string;
  /** Env vars injected into the project env on install */
  envVars: { key: string; description: string; valueHint: string }[];
  /** Snippet shown as usage example */
  snippet: string;
}

const PLUGINS: PluginDef[] = [
  {
    id: "devos-auth",
    name: "DevOS Auth",
    description: "Complete sign-in system — email/password and OAuth — scoped to your project. Users never need a DevOS account.",
    category: "Identity",
    icon: Zap,
    color: "blue",
    phase: 1,
    freeTier: "100 sign-ins / mo",
    creditCost: "1 credit per 10 sign-ins above free tier",
    envVars: [
      { key: "DEVOS_AUTH_KEY", description: "Project-scoped auth key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const auth = DevOSAuth.init(process.env.DEVOS_AUTH_KEY);
await auth.signUp("user@example.com", "password");
const user = await auth.signIn("user@example.com", "password");`,
  },
  {
    id: "devos-database",
    name: "DevOS Database",
    description: "Real-time document database (Firestore-backed) scoped to your project. Define your own collections and rules.",
    category: "Data",
    icon: Database,
    color: "purple",
    phase: 1,
    freeTier: "1,000 reads / day",
    creditCost: "1 credit per write",
    envVars: [
      { key: "DEVOS_DB_KEY", description: "Project-scoped database key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const db = DevOSDB.init(process.env.DEVOS_DB_KEY);
await db.collection("messages").add({ text: "Hello!", userId: user.uid });
const msgs = await db.collection("messages").get();`,
  },
  {
    id: "devos-storage",
    name: "DevOS Storage",
    description: "Secure file and image storage for your project users. Upload, retrieve, and delete files via a simple SDK.",
    category: "Files",
    icon: HardDrive,
    color: "green",
    phase: 1,
    freeTier: "1 GB storage",
    creditCost: "5 credits per GB / mo above free tier",
    envVars: [
      { key: "DEVOS_STORAGE_KEY", description: "Project-scoped storage key", valueHint: "auto-generated" },
      { key: "DEVOS_STORAGE_BUCKET", description: "Storage bucket name", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const storage = DevOSStorage.init(process.env.DEVOS_STORAGE_KEY);
const url = await storage.upload("avatars/user.png", fileBlob);
await storage.delete("avatars/user.png");`,
  },
  {
    id: "devos-email",
    name: "DevOS Email",
    description: "Send transactional emails from your project — welcome emails, password resets, notifications, and more.",
    category: "Communication",
    icon: Mail,
    color: "yellow",
    phase: 2,
    freeTier: "100 emails / mo",
    creditCost: "1 credit per 10 emails above free tier",
    envVars: [
      { key: "DEVOS_EMAIL_KEY", description: "Project-scoped email service key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const email = DevOSEmail.init(process.env.DEVOS_EMAIL_KEY);
await email.send({
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to my app</h1>",
});`,
  },
  {
    id: "devos-realtime",
    name: "DevOS Realtime",
    description: "WebSocket-based pub/sub messaging for live collaboration features — chat, notifications, live cursors.",
    category: "Data/Sync",
    icon: Zap,
    color: "cyan",
    phase: 2,
    freeTier: "10,000 messages / mo",
    creditCost: "1 credit per 1,000 messages above free tier",
    envVars: [
      { key: "DEVOS_RT_KEY", description: "Realtime channel key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const rt = DevOSRealtime.init(process.env.DEVOS_RT_KEY);
const channel = rt.channel("room:general");
channel.on("message", (msg) => console.log(msg));
await channel.send("message", { text: "Hello!" });`,
  },
  {
    id: "devos-queue",
    name: "DevOS Queue",
    description: "Background job queue for your project — schedule tasks, retry on failure, track job status.",
    category: "Backend",
    icon: Layers,
    color: "orange",
    phase: 2,
    freeTier: "100 jobs / mo",
    creditCost: "1 credit per 10 jobs above free tier",
    envVars: [
      { key: "DEVOS_QUEUE_KEY", description: "Job queue key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const queue = DevOSQueue.init(process.env.DEVOS_QUEUE_KEY);
await queue.enqueue("send-welcome-email", { userId: "abc123" });
queue.process("send-welcome-email", async (job) => {
  // handle job
});`,
  },
  {
    id: "devos-webhooks",
    name: "DevOS Webhooks",
    description: "Receive and dispatch webhooks. Listen for external events (Stripe, GitHub, etc.) or notify other services.",
    category: "Integration",
    icon: Globe,
    color: "pink",
    phase: 2,
    freeTier: "Unlimited incoming",
    creditCost: "1 credit per 100 outbound dispatched",
    envVars: [
      { key: "DEVOS_WEBHOOK_SECRET", description: "Secret for verifying incoming webhooks", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const hooks = DevOSWebhooks.init(process.env.DEVOS_WEBHOOK_SECRET);
// Verify an incoming webhook from Stripe
hooks.verify(req.body, req.headers["stripe-signature"]);`,
  },
  {
    id: "devos-push",
    name: "DevOS Push",
    description: "Send browser and mobile push notifications to your project users.",
    category: "Communication",
    icon: Bell,
    color: "red",
    phase: 3,
    freeTier: "1,000 pushes / mo",
    creditCost: "1 credit per 100 pushes above free tier",
    envVars: [
      { key: "DEVOS_PUSH_KEY", description: "Push notification key", valueHint: "auto-generated" },
      { key: "DEVOS_PUSH_VAPID_PUBLIC", description: "VAPID public key for Web Push", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const push = DevOSPush.init(process.env.DEVOS_PUSH_KEY);
await push.subscribe(userId, subscription);
await push.send(userId, { title: "New message", body: "You have 1 unread message" });`,
  },
  {
    id: "devos-flags",
    name: "DevOS Feature Flags",
    description: "Roll out new features gradually. Toggle flags per user, percentage, or attribute without redeploying.",
    category: "Release Management",
    icon: ToggleLeft,
    color: "teal",
    phase: 3,
    freeTier: "Unlimited flags",
    creditCost: "Free",
    envVars: [
      { key: "DEVOS_FLAGS_KEY", description: "Feature flags key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const flags = DevOSFlags.init(process.env.DEVOS_FLAGS_KEY);
const isEnabled = await flags.isEnabled("new-checkout", user.id);
if (isEnabled) showNewCheckout(); else showOldCheckout();`,
  },
  {
    id: "devos-analytics",
    name: "DevOS Analytics",
    description: "Track events in your project — page views, button clicks, funnels — with a one-line SDK.",
    category: "Insights",
    icon: Database,
    color: "indigo",
    phase: 3,
    freeTier: "10,000 events / mo",
    creditCost: "1 credit per 1,000 events above free tier",
    envVars: [
      { key: "DEVOS_ANALYTICS_KEY", description: "Analytics write key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const analytics = DevOSAnalytics.init(process.env.DEVOS_ANALYTICS_KEY);
analytics.track("button_clicked", { buttonId: "cta", userId: user.id });
analytics.page("Home", { userId: user.id });`,
  },
  {
    id: "devos-search",
    name: "DevOS Search",
    description: "Full-text search over your project data. Index documents and query them with filters, ranking, and facets.",
    category: "Discovery",
    icon: Database,
    color: "slate",
    phase: 3,
    freeTier: "10,000 queries / mo",
    creditCost: "1 credit per 100 queries above free tier",
    envVars: [
      { key: "DEVOS_SEARCH_KEY", description: "Search index key", valueHint: "auto-generated" },
      { key: "DEVOS_SEARCH_INDEX", description: "Default search index name", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `const search = DevOSSearch.init(process.env.DEVOS_SEARCH_KEY);
await search.index("products").add({ id: "1", name: "Widget", price: 9.99 });
const results = await search.index("products").query("widget");`,
  },
  {
    id: "devos-forms",
    name: "DevOS Forms",
    description: "Collect form submissions without a backend. Spam protection, email notifications, and CSV export included.",
    category: "Data Collection",
    icon: ClipboardList,
    color: "lime",
    phase: 3,
    freeTier: "100 submissions / mo",
    creditCost: "1 credit per 10 submissions above free tier",
    envVars: [
      { key: "DEVOS_FORMS_KEY", description: "Forms endpoint key", valueHint: "auto-generated" },
      { key: "DEVOS_PROJECT_ID", description: "Your DevOS project ID", valueHint: "auto-generated" },
    ],
    snippet: `<!-- Drop in your HTML form -->
<form action="https://forms.devos.name.ng/{{DEVOS_PROJECT_ID}}" method="POST">
  <input name="email" type="email" required />
  <button type="submit">Subscribe</button>
</form>`,
  },
];

// ── Colour helpers ───────────────────────────────────────────────────────────

const COLOUR_MAP: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: "bg-blue-600/15",   text: "text-blue-400",   border: "border-blue-500/30",   badge: "bg-blue-500/20 text-blue-300" },
  purple: { bg: "bg-purple-600/15", text: "text-purple-400", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-300" },
  green:  { bg: "bg-green-600/15",  text: "text-green-400",  border: "border-green-500/30",  badge: "bg-green-500/20 text-green-300" },
  yellow: { bg: "bg-yellow-600/15", text: "text-yellow-400", border: "border-yellow-500/30", badge: "bg-yellow-500/20 text-yellow-300" },
  cyan:   { bg: "bg-cyan-600/15",   text: "text-cyan-400",   border: "border-cyan-500/30",   badge: "bg-cyan-500/20 text-cyan-300" },
  orange: { bg: "bg-orange-600/15", text: "text-orange-400", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-300" },
  pink:   { bg: "bg-pink-600/15",   text: "text-pink-400",   border: "border-pink-500/30",   badge: "bg-pink-500/20 text-pink-300" },
  red:    { bg: "bg-red-600/15",    text: "text-red-400",    border: "border-red-500/30",    badge: "bg-red-500/20 text-red-300" },
  teal:   { bg: "bg-teal-600/15",   text: "text-teal-400",   border: "border-teal-500/30",   badge: "bg-teal-500/20 text-teal-300" },
  indigo: { bg: "bg-indigo-600/15", text: "text-indigo-400", border: "border-indigo-500/30", badge: "bg-indigo-500/20 text-indigo-300" },
  slate:  { bg: "bg-slate-600/15",  text: "text-slate-400",  border: "border-slate-500/30",  badge: "bg-slate-500/20 text-slate-300" },
  lime:   { bg: "bg-lime-600/15",   text: "text-lime-400",   border: "border-lime-500/30",   badge: "bg-lime-500/20 text-lime-300" },
};

function col(color: string) {
  return COLOUR_MAP[color] ?? COLOUR_MAP.blue;
}

// ── Auth plugin UI file templates ────────────────────────────────────────────

const AUTH_FILES: { name: string; path: string; language: string; content: (key: string, projectId: string) => string }[] = [
  {
    name: "devos-auth.js",
    path: "/devos-auth.js",
    language: "javascript",
    content: (key, projectId) => `/**
 * DevOS Auth — lightweight client SDK
 * Auto-generated by the DevOS Plugin Marketplace
 *
 * Usage:
 *   const auth = DevOSAuth.init("${key}");
 *   await auth.signUp(email, password);
 *   const user = await auth.signIn(email, password);
 *   auth.onAuthStateChanged(user => { ... });
 */
(function (global) {
  "use strict";

  const ENDPOINT = "https://api.devos.name.ng/plugins/auth/v1";
  const PROJECT_ID = "${projectId}";
  const STORAGE_KEY = "devos_auth_user_${projectId.slice(0, 8)}";

  function DevOSAuth(projectKey) {
    this._key = projectKey;
    this._listeners = [];
    this._user = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  }

  DevOSAuth.prototype.signUp = async function (email, password) {
    const res = await fetch(\`\${ENDPOINT}/signup\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-DevOS-Key": this._key },
      body: JSON.stringify({ email, password, projectId: PROJECT_ID }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Sign-up failed");
    const user = await res.json();
    this._setUser(user);
    return user;
  };

  DevOSAuth.prototype.signIn = async function (email, password) {
    const res = await fetch(\`\${ENDPOINT}/signin\`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-DevOS-Key": this._key },
      body: JSON.stringify({ email, password, projectId: PROJECT_ID }),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Sign-in failed");
    const user = await res.json();
    this._setUser(user);
    return user;
  };

  DevOSAuth.prototype.signOut = function () {
    this._setUser(null);
  };

  DevOSAuth.prototype.currentUser = function () {
    return this._user;
  };

  DevOSAuth.prototype.onAuthStateChanged = function (callback) {
    this._listeners.push(callback);
    callback(this._user);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== callback);
    };
  };

  DevOSAuth.prototype._setUser = function (user) {
    this._user = user;
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
    this._listeners.forEach((l) => l(user));
  };

  global.DevOSAuth = {
    init: function (projectKey) {
      return new DevOSAuth(projectKey || "${key}");
    },
  };
})(typeof window !== "undefined" ? window : this);
`,
  },
  {
    name: "login.html",
    path: "/login.html",
    language: "html",
    content: (key, projectId) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In</title>
  <link rel="stylesheet" href="auth.css" />
</head>
<body>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#3b82f6"/>
          <path d="M9 16l5 5 9-9" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <h1 class="auth-title" id="authTitle">Welcome back</h1>
      <p class="auth-subtitle" id="authSubtitle">Sign in to your account</p>

      <div id="errorBanner" class="error-banner hidden"></div>

      <form id="authForm" class="auth-form">
        <div class="form-group" id="nameGroup" style="display:none">
          <label for="nameInput">Full name</label>
          <input id="nameInput" type="text" placeholder="Your name" />
        </div>
        <div class="form-group">
          <label for="emailInput">Email</label>
          <input id="emailInput" type="email" placeholder="you@example.com" required />
        </div>
        <div class="form-group">
          <label for="passwordInput">Password</label>
          <input id="passwordInput" type="password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="btn-primary" id="submitBtn">Sign in</button>
      </form>

      <p class="auth-switch">
        <span id="switchText">Don't have an account?</span>
        <button class="link-btn" id="switchBtn" type="button">Sign up</button>
      </p>

      <div id="userPanel" class="user-panel hidden">
        <p>Signed in as <strong id="userEmail"></strong></p>
        <button class="btn-outline" id="signOutBtn" type="button">Sign out</button>
      </div>
    </div>
  </div>

  <script src="devos-auth.js"></script>
  <script>
    const auth = DevOSAuth.init("${key}");
    let isSignUp = false;

    const form = document.getElementById("authForm");
    const title = document.getElementById("authTitle");
    const subtitle = document.getElementById("authSubtitle");
    const nameGroup = document.getElementById("nameGroup");
    const nameInput = document.getElementById("nameInput");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const submitBtn = document.getElementById("submitBtn");
    const switchBtn = document.getElementById("switchBtn");
    const switchText = document.getElementById("switchText");
    const errorBanner = document.getElementById("errorBanner");
    const userPanel = document.getElementById("userPanel");
    const userEmail = document.getElementById("userEmail");
    const signOutBtn = document.getElementById("signOutBtn");

    auth.onAuthStateChanged((user) => {
      if (user) {
        form.style.display = "none";
        document.querySelector(".auth-switch").style.display = "none";
        userPanel.classList.remove("hidden");
        userEmail.textContent = user.email || user.uid;
      } else {
        form.style.display = "block";
        document.querySelector(".auth-switch").style.display = "block";
        userPanel.classList.add("hidden");
      }
    });

    switchBtn.addEventListener("click", () => {
      isSignUp = !isSignUp;
      title.textContent = isSignUp ? "Create an account" : "Welcome back";
      subtitle.textContent = isSignUp ? "Join us today" : "Sign in to your account";
      submitBtn.textContent = isSignUp ? "Create account" : "Sign in";
      switchText.textContent = isSignUp ? "Already have an account?" : "Don't have an account?";
      switchBtn.textContent = isSignUp ? "Sign in" : "Sign up";
      nameGroup.style.display = isSignUp ? "block" : "none";
      hideError();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError();
      submitBtn.disabled = true;
      submitBtn.textContent = isSignUp ? "Creating…" : "Signing in…";
      try {
        if (isSignUp) {
          await auth.signUp(emailInput.value, passwordInput.value);
        } else {
          await auth.signIn(emailInput.value, passwordInput.value);
        }
      } catch (err) {
        showError(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUp ? "Create account" : "Sign in";
      }
    });

    signOutBtn.addEventListener("click", () => auth.signOut());

    function showError(msg) {
      errorBanner.textContent = msg;
      errorBanner.classList.remove("hidden");
    }
    function hideError() {
      errorBanner.classList.add("hidden");
    }
  </script>
</body>
</html>
`,
  },
  {
    name: "auth.css",
    path: "/auth.css",
    language: "css",
    content: () => `/* DevOS Auth — auto-generated styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0a0a0a;
  color: #e5e7eb;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 1.5rem;
}

.auth-card {
  background: #111827;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}

.auth-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 0.375rem;
  color: #f9fafb;
}

.auth-subtitle {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.4);
  text-align: center;
  margin-bottom: 1.5rem;
}

.error-banner {
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.8125rem;
  margin-bottom: 1rem;
}

.hidden { display: none !important; }

.auth-form { display: flex; flex-direction: column; gap: 1rem; }

.form-group { display: flex; flex-direction: column; gap: 0.375rem; }

.form-group label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(255,255,255,0.6);
}

.form-group input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  color: #f9fafb;
  outline: none;
  transition: border-color 0.15s;
}

.form-group input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.form-group input::placeholder { color: rgba(255,255,255,0.2); }

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.6875rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  margin-top: 0.25rem;
}

.btn-primary:hover { background: #2563eb; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  background: transparent;
  color: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-outline:hover {
  background: rgba(255,255,255,0.05);
  color: #f9fafb;
}

.auth-switch {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.35);
}

.link-btn {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  font-size: inherit;
  padding: 0 0.25rem;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-btn:hover { color: #93c5fd; }

.user-panel {
  text-align: center;
  padding-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  color: rgba(255,255,255,0.7);
  font-size: 0.875rem;
}
`,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateProjectKey(_pluginId: PluginId, _projectId: string): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return `pk_${rand}_${Date.now().toString(36).toUpperCase()}`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface PluginPanelProps {
  project: Project | null;
  projectId: string;
  readOnly?: boolean;
  /** Called after files are created so IDE can refresh its file list */
  onFilesCreated?: () => void;
}

export default function PluginPanel({ project, projectId, readOnly = false, onFilesCreated }: PluginPanelProps) {
  const [user] = useAuthState(auth);
  const [installing, setInstalling] = useState<PluginId | null>(null);
  const [uninstalling, setUninstalling] = useState<PluginId | null>(null);
  const [expanded, setExpanded] = useState<PluginId | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"marketplace" | "settings">("marketplace");

  const installedPlugins: Record<string, InstalledPlugin> = (project?.plugins as any) ?? {};

  const handleInstall = async (plugin: PluginDef) => {
    if (!user || !projectId || readOnly) return;
    setInstalling(plugin.id);
    try {
      const projectKey = generateProjectKey(plugin.id, projectId);

      // Build env var map to inject
      const envUpdates: Record<string, string> = {};
      for (const ev of plugin.envVars) {
        const existing = project?.env?.[ev.key];
        if (!existing) {
          // Only set if not already present so we don't overwrite user values
          if (ev.key === "DEVOS_PROJECT_ID") {
            envUpdates[`env.${ev.key}`] = projectId;
          } else if (ev.key.includes("_KEY") || ev.key.includes("_SECRET")) {
            envUpdates[`env.${ev.key}`] = projectKey;
          } else if (ev.key.includes("_BUCKET")) {
            envUpdates[`env.${ev.key}`] = `devos-media`;
          } else if (ev.key.includes("_INDEX")) {
            envUpdates[`env.${ev.key}`] = `${projectId.slice(0, 8)}-index`;
          } else if (ev.key.includes("_VAPID_PUBLIC")) {
            envUpdates[`env.${ev.key}`] = `BDevOSVapid_${projectKey.slice(3, 11)}`;
          } else {
            envUpdates[`env.${ev.key}`] = projectKey;
          }
        }
      }

      const pluginRecord: InstalledPlugin = {
        pluginId: plugin.id,
        installedAt: serverTimestamp(),
        envVars: plugin.envVars.map((ev) => ev.key),
        projectKey,
        enabled: true,
      };

      await updateDoc(doc(db, "projects", projectId), {
        ...envUpdates,
        [`plugins.${plugin.id}`]: pluginRecord,
        updatedAt: serverTimestamp(),
      });

      // For DevOS Auth: auto-create UI files (devos-auth.js, login.html, auth.css)
      if (plugin.id === "devos-auth") {
        const filesRef = collection(db, "projects", projectId, "files");
        // Check which files already exist to avoid duplicates
        const existingSnap = await getDocs(query(filesRef, where("projectId", "==", projectId)));
        const existingNames = new Set(existingSnap.docs.map((d) => d.data().name as string));
        const authKey = envUpdates[`env.DEVOS_AUTH_KEY`] ?? project?.env?.DEVOS_AUTH_KEY ?? projectKey;
        for (const tpl of AUTH_FILES) {
          if (!existingNames.has(tpl.name)) {
            await addDoc(filesRef, {
              projectId,
              name: tpl.name,
              path: tpl.path,
              content: tpl.content(authKey, projectId),
              language: tpl.language,
              updatedAt: serverTimestamp(),
            });
          }
        }
        onFilesCreated?.();
        toast.success(`${plugin.name} installed! Auth UI files (login.html, auth.css, devos-auth.js) added to your project.`);
      } else {
        toast.success(`${plugin.name} installed! Env vars have been added to your project.`);
      }
      setExpanded(plugin.id);
    } catch (err) {
      console.error("[PluginPanel] Install failed:", err);
      toast.error(`Failed to install ${plugin.name}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (plugin: PluginDef) => {
    if (!user || !projectId || readOnly) return;
    setUninstalling(plugin.id);
    try {
      const installed = installedPlugins[plugin.id];

      // Build env var removal map (only vars that were injected by this plugin)
      const envRemovals: Record<string, any> = {};
      if (installed?.envVars) {
        for (const key of installed.envVars) {
          // Only remove DEVOS_PROJECT_ID if no other plugin uses it
          if (key === "DEVOS_PROJECT_ID") {
            const otherPluginsInstalled = Object.keys(installedPlugins).filter(
              (pid) => pid !== plugin.id && installedPlugins[pid].envVars?.includes(key)
            );
            if (otherPluginsInstalled.length > 0) continue;
          }
          envRemovals[`env.${key}`] = deleteFieldSentinel();
        }
      }

      const { deleteField } = await import("firebase/firestore");
      const envRemovalsResolved: Record<string, any> = {};
      if (installed?.envVars) {
        for (const key of installed.envVars) {
          if (key === "DEVOS_PROJECT_ID") {
            const otherPluginsInstalled = Object.keys(installedPlugins).filter(
              (pid) => pid !== plugin.id && installedPlugins[pid].envVars?.includes(key)
            );
            if (otherPluginsInstalled.length > 0) continue;
          }
          envRemovalsResolved[`env.${key}`] = deleteField();
        }
      }

      await updateDoc(doc(db, "projects", projectId), {
        ...envRemovalsResolved,
        [`plugins.${plugin.id}`]: (await import("firebase/firestore")).deleteField(),
        updatedAt: serverTimestamp(),
      });

      toast.success(`${plugin.name} uninstalled.`);
    } catch (err) {
      console.error("[PluginPanel] Uninstall failed:", err);
      toast.error(`Failed to uninstall ${plugin.name}`);
    } finally {
      setUninstalling(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  };

  const toggleKeyVisibility = (key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const installedCount = Object.keys(installedPlugins).length;

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-[#21262D] flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Puzzle className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider">Plugin Marketplace</h3>
        </div>
        <p className="text-[11px] text-white/30 leading-relaxed">
          Add backend superpowers to your project — auth, database, storage, and more.
          Installing a plugin automatically injects the required environment variables.
        </p>
        {installedCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/20">
              {installedCount} installed
            </span>
          </div>
        )}
        {/* Tabs */}
        <div className="mt-3 flex gap-1 p-0.5 bg-white/5 rounded-lg">
          <button
            onClick={() => setActiveTab("marketplace")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
              activeTab === "marketplace"
                ? "bg-blue-600 text-white shadow"
                : "text-white/40 hover:text-white/70"
            )}
          >
            <Puzzle className="w-3 h-3" />
            Marketplace
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all",
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow"
                : "text-white/40 hover:text-white/70"
            )}
          >
            <Settings className="w-3 h-3" />
            Settings
            {installedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold">
                {installedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto p-3">
          {installedCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                <Settings className="w-6 h-6 text-white/20" />
              </div>
              <p className="text-sm font-semibold text-white/40">No plugins installed</p>
              <p className="text-[11px] text-white/25 max-w-[200px]">
                Install plugins from the Marketplace tab to manage them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-2">Installed Plugins</p>
              {PLUGINS.filter((p) => !!installedPlugins[p.id]).map((plugin) => {
                const installed = installedPlugins[plugin.id];
                const c = col(plugin.color);
                const Icon = plugin.icon;
                return (
                  <div key={plugin.id} className={cn("rounded-xl border p-3 space-y-3", c.border, "bg-surface")}>
                    {/* Plugin header */}
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
                        <Icon className={cn("w-4 h-4", c.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{plugin.name}</p>
                        <p className="text-[10px] text-white/30">{plugin.category}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Active
                      </span>
                    </div>

                    {/* Env vars / keys */}
                    {installed?.envVars && installed.envVars.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Environment Keys</p>
                        {installed.envVars.map((envKey: string) => {
                          const envValue = (project as any)?.env?.[envKey] || "";
                          const isHidden = hiddenKeys.has(`settings_${envKey}`);
                          const displayValue = isHidden ? "•".repeat(Math.min(envValue.length || 20, 20)) : (envValue || "(auto-generated)");
                          return (
                            <div key={envKey} className="rounded-lg bg-black/30 border border-border-base p-2">
                              <p className="text-[10px] font-mono text-white/50 mb-1">{envKey}</p>
                              <div className="flex items-center gap-1.5">
                                <code className="flex-1 text-[10px] font-mono text-green-300/70 truncate">
                                  {displayValue}
                                </code>
                                {envValue && (
                                  <>
                                    <button
                                      onClick={() => toggleKeyVisibility(`settings_${envKey}`)}
                                      className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                      {isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => copyToClipboard(envValue, `settings_${envKey}`)}
                                      className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                                    >
                                      {copiedKey === `settings_${envKey}` ? (
                                        <Check className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Usage snippet */}
                    <div>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold mb-1.5">Usage Example</p>
                      <pre className="text-[10px] font-mono text-green-300/60 bg-black/40 border border-border-base rounded-lg p-2 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                        {plugin.snippet}
                      </pre>
                    </div>

                    {/* Uninstall */}
                    {!readOnly && (
                      <div className="pt-1 border-t border-border-base">
                        <button
                          onClick={() => {
                            setActiveTab("marketplace");
                            setExpanded(plugin.id);
                          }}
                          className="flex items-center gap-1.5 text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Uninstall plugin
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Plugin list */}
      {activeTab === "marketplace" && (
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PLUGINS.map((plugin) => {
          const isInstalled = !!installedPlugins[plugin.id];
          const isExpanded = expanded === plugin.id;
          const c = col(plugin.color);
          const Icon = plugin.icon;
          const installed = installedPlugins[plugin.id];
          const isInstallingThis = installing === plugin.id;
          const isUninstallingThis = uninstalling === plugin.id;

          return (
            <div
              key={plugin.id}
              className={cn(
                "rounded-xl border transition-all",
                isInstalled
                  ? `${c.border} bg-surface`
                  : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
              )}
            >
              {/* Card header */}
              <div className="p-3 flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", c.bg)}>
                  <Icon className={cn("w-4 h-4", c.text)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white truncate">{plugin.name}</span>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", c.badge)}>
                      {plugin.category}
                    </span>
                    {isInstalled && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{plugin.description}</p>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-white/25">Free: {plugin.freeTier}</span>
                    <span className="text-[10px] text-white/20">·</span>
                    <span className="text-[10px] text-white/25">{plugin.creditCost}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!isInstalled ? (
                    <button
                      onClick={() => handleInstall(plugin)}
                      disabled={isInstallingThis || readOnly}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                        readOnly
                          ? "bg-white/5 text-white/20 cursor-not-allowed"
                          : `${c.bg} ${c.text} hover:opacity-80`
                      )}
                      title={readOnly ? "Only the project owner can install plugins" : `Install ${plugin.name}`}
                    >
                      {isInstallingThis ? (
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Install
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : plugin.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                        title="Show details"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleUninstall(plugin)}
                        disabled={isUninstallingThis || readOnly}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40"
                        title="Uninstall plugin"
                      >
                        {isUninstallingThis ? (
                          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded details: env vars + snippet */}
              {isInstalled && isExpanded && (
                <div className="px-3 pb-3 border-t border-white/[0.05] mt-0 pt-3 space-y-3">
                  {/* Env vars */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Info className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                        Injected Environment Variables
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {plugin.envVars.map((ev) => {
                        const value = project?.env?.[ev.key] ?? "(not set)";
                        const isHidden = hiddenKeys.has(ev.key);
                        const isCopied = copiedKey === ev.key;
                        const isSensitive = ev.key.includes("_KEY") || ev.key.includes("_SECRET");
                        return (
                          <div key={ev.key} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-mono font-bold text-blue-300">{ev.key}</p>
                                <p className="text-[10px] text-white/30 mt-0.5">{ev.description}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isSensitive && (
                                  <button
                                    onClick={() => toggleKeyVisibility(ev.key)}
                                    className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                                    title={isHidden ? "Show value" : "Hide value"}
                                  >
                                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                )}
                                <button
                                  onClick={() => copyToClipboard(value, ev.key)}
                                  className="p-1 rounded text-white/20 hover:text-white/50 transition-colors"
                                  title="Copy value"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                            <p className={cn(
                              "text-[10px] font-mono mt-1.5 px-2 py-1 rounded bg-black/30",
                              isSensitive && !isHidden ? "blur-sm select-none" : ""
                            )}>
                              {value === "(not set)" ? (
                                <span className="text-white/20 italic">(not set)</span>
                              ) : (
                                <span className="text-green-300/80">{value}</span>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Code snippet */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Usage Example</span>
                      <button
                        onClick={() => copyToClipboard(plugin.snippet, `snippet_${plugin.id}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-white/30 hover:text-white/60 text-[10px] transition-colors"
                      >
                        {copiedKey === `snippet_${plugin.id}` ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copy
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-green-300/70 bg-black/40 border border-white/[0.05] rounded-lg p-2.5 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {plugin.snippet}
                    </pre>
                  </div>

                  {/* Install timestamp */}
                  {installed?.installedAt && (
                    <p className="text-[10px] text-white/20">
                      Installed {installed.installedAt?.toDate?.()?.toLocaleDateString() ?? "recently"}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Footer note */}
      <div className="p-3 border-t border-[#21262D] flex-shrink-0">
        <p className="text-[10px] text-white/20 text-center leading-relaxed">
          Plugin Marketplace · {installedCount} active plugin{installedCount !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// Placeholder — real deleteField is imported dynamically in handleUninstall
function deleteFieldSentinel() {
  return "__DELETE__";
}
