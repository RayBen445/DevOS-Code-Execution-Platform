# DevOS Plugin Marketplace — Design Document

> **Status: Pre-design / Not yet implemented.**  
> This document reasons through the full architecture so that when we do build it, every decision is already thought out.

---

## What Is the Plugin Marketplace?

The DevOS Plugin Marketplace is a system that lets developers add **backend superpowers to their own projects** directly from the IDE — with one click, no server configuration, no sign-up for a separate service.

Think of it like this: today a developer on DevOS can write an HTML/JS app and deploy it as a static site. That's great, but what if they want users to be able to log in? Or save data? Or upload a profile picture? Normally they'd have to leave DevOS, create a Firebase/Supabase account, wire up credentials, and write all the plumbing themselves.

The Plugin Marketplace removes all of that friction. DevOS already **owns** Firebase Auth, Firestore, and Firebase Storage under the hood for its own platform. The Plugin Marketplace **exposes slices of that same infrastructure** to the developer's project — scoped, sandboxed, and managed from the IDE sidebar.

---

## The Three Core Plugins

### 1. DevOS Auth

**What it gives the developer's app:**  
A complete sign-in system — email/password, Google OAuth, and GitHub OAuth — injected into their project as a tiny JavaScript client library (`devos-auth.js`).

**How it maps to the existing codebase:**  
DevOS already uses Firebase Auth (`src/lib/firebase.ts` exports `auth`, `googleProvider`, `githubProvider`, TOTP MFA helpers, etc.). The plugin would expose a **project-scoped identity layer** on top of that. Each installed DevOS Auth instance gets:

- A unique **Project Auth Namespace** — a string like `proj_abc123` — used to prefix every user document.
- Users created by the developer's app are stored in Firestore under:
  ```
  plugin_data/{projectId}/auth/users/{appUserId}
  ```
  These are entirely separate from the DevOS platform users stored in `users/{uid}`. An end-user of the developer's app never needs a DevOS account.
- A **short-lived signed token** (JWT) issued by a Cloud Function. When a visitor to the developer's deployed site signs in, the client library calls this function, which verifies the credentials and returns a token valid only for that project's plugin namespace.

**What the developer writes in their app code:**
```html
<!-- auto-injected by DevOS when the plugin is installed -->
<script src="https://cdn.devos.name.ng/plugins/auth/v1/devos-auth.min.js"></script>
<script>
  const auth = DevOSAuth.init("proj_abc123");  // project key injected as env var

  // Sign up a new user
  await auth.signUp("user@example.com", "password123");

  // Sign in
  const user = await auth.signIn("user@example.com", "password123");

  // Get current user
  const me = auth.currentUser();  // { uid, email, displayName, ... }

  // Sign out
  await auth.signOut();

  // Listen to auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) showDashboard(user);
    else showLoginForm();
  });
</script>
```

**IDE management panel:**  
A sidebar tab called "Auth" shows:
- A list of all registered users (email, sign-in method, joined date, last active)
- Buttons to disable, delete, or reset a user's password
- Toggle switches for which sign-in methods are enabled (email, Google, GitHub)
- A "Require email verification" toggle
- Usage stats: sign-ins this month, active users

**How credits work:**  
Installing the plugin is free. Credits are consumed per operation (configurable by the admin):  
- Each unique sign-in event: small credit charge  
- Each user record stored beyond a free tier (e.g., first 50 users free): monthly flat charge  

---

### 2. DevOS Database

**What it gives the developer's app:**  
A real-time, document-oriented database (backed by Firestore) scoped exclusively to the developer's project. The developer never touches Firestore directly — they use `devos-db.js`, a thin wrapper that automatically scopes all reads and writes to their project's namespace and enforces their custom rules.

**How it maps to the existing codebase:**  
DevOS already uses Firestore extensively — projects, users, notifications, feed posts, activity logs, etc., all live there. The plugin system adds a second "layer" of Firestore usage: a **developer data plane** completely separate from the **platform data plane**.

Every installed database plugin gets a root collection path:
```
plugin_data/{projectId}/db/{developerCollection}/{documentId}
```

For example, if a developer creates a `messages` collection, data lives at:
```
plugin_data/proj_abc123/db/messages/msg_001
```

The developer's app never knows about the full path — the SDK handles the prefix transparently.

**Security rules:**  
The developer defines rules in a JSON schema editor inside the IDE. Example schema:
```json
{
  "messages": {
    "read": "authenticated",
    "write": "owner",
    "fields": {
      "text":    { "type": "string", "max": 500 },
      "author":  { "type": "string" },
      "sentAt":  { "type": "timestamp" }
    }
  },
  "profiles": {
    "read": "public",
    "write": "owner"
  }
}
```
These rules are translated server-side into Firestore security rules (or enforced by a Cloud Function proxy) each time they are saved.

**What the developer writes in their app code:**
```html
<script src="https://cdn.devos.name.ng/plugins/db/v1/devos-db.min.js"></script>
<script>
  const db = DevOSDB.init("proj_abc123");

  // Create a document
  await db.collection("messages").add({
    text: "Hello, world!",
    author: auth.currentUser().uid,
    sentAt: DevOSDB.serverTimestamp()
  });

  // Query documents
  const msgs = await db.collection("messages")
    .where("author", "==", uid)
    .orderBy("sentAt", "desc")
    .limit(20)
    .get();

  // Real-time listener
  db.collection("messages").onSnapshot((docs) => {
    renderMessages(docs);
  });

  // Update / delete
  await db.collection("messages").doc("msg_001").update({ text: "Updated!" });
  await db.collection("messages").doc("msg_001").delete();
</script>
```

**IDE management panel:**  
A "Database" sidebar tab shows:
- A visual collection browser (like the Firebase Console) — click a collection to see its documents, click a document to see its fields
- Inline JSON editor for documents
- A schema/rules editor with a syntax-highlighted JSON editor and a "Validate & Save" button
- Import/export as JSON
- Usage stats: total documents, reads this month, writes this month, storage used

**How credits work:**  
- First N reads/writes per day are free (configurable by admin)  
- Each read beyond the free tier: tiny credit charge  
- Each write beyond the free tier: small credit charge  
- Storage: flat credit charge per MB per month  

---

### 3. DevOS Storage

**What it gives the developer's app:**  
A file-hosting and CDN service. The developer's app can let end-users upload images, videos, documents, or any file. Files are stored in Firebase Storage (or Supabase Storage, matching the existing dual-backend in `storageService.ts`) under a project-scoped path, and served via a fast public CDN URL.

**How it maps to the existing codebase:**  
`src/lib/storageService.ts` already exposes `uploadImage(file, path)` that tries Supabase first and falls back to Firebase Storage. The plugin Storage system would expose the same dual-backend strategy but scoped to the developer's project:
```
plugin_uploads/{projectId}/{filePath}
```

Existing helpers like `avatarPath()` and `eventBannerPath()` show the path convention already in use — plugin uploads follow the same pattern but under `plugin_uploads/` instead of `users/` or `events/`.

**What the developer writes in their app code:**
```html
<script src="https://cdn.devos.name.ng/plugins/storage/v1/devos-storage.min.js"></script>
<script>
  const storage = DevOSStorage.init("proj_abc123");

  // Upload a file (with progress)
  const fileInput = document.querySelector("#avatar");
  const url = await storage.upload(fileInput.files[0], "avatars/user123.jpg", {
    onProgress: (pct) => progressBar.style.width = pct + "%"
  });

  // List files in a folder
  const files = await storage.list("avatars/");

  // Get a public URL for a known path
  const url = storage.getUrl("avatars/user123.jpg");

  // Delete a file
  await storage.delete("avatars/user123.jpg");
</script>
```

**Access control:**  
The developer can set a folder-level policy in the IDE panel:
- `public` — anyone can read; only the owning project can write  
- `authenticated` — only users signed in via DevOS Auth can read/write  
- `private` — only the server-side Cloud Function (using the project's secret key) can read/write; the client gets time-limited signed URLs  

**IDE management panel:**  
A "Storage" sidebar tab shows:
- A file browser with folder navigation and thumbnail previews for images
- Upload files from the browser directly (drag and drop)
- Copy public URL / Generate a signed URL (time-limited)
- Delete files
- Set folder access policies
- Usage stats: total files, total size, bandwidth used this month

**How credits work:**  
- First N MB of storage free per project  
- Each additional MB stored: tiny monthly credit charge  
- Bandwidth (download): free up to a limit, then small charge per GB  
- Uploads: free  

---

## How Plugin Installation Works (End-to-End Flow)

### Step 1 — Discovery
A new "Plugins" tab appears in the IDE sidebar (alongside Files, Settings, Activity). It lists available plugins in a card grid:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  🔐 DevOS Auth  │  │  🗄️ DevOS DB    │  │  📦 DevOS Store │
│  Add user login │  │  Real-time data │  │  File uploads   │
│  to your app    │  │  for your app   │  │  & CDN          │
│                 │  │                 │  │                 │
│  [Install]      │  │  [Install]      │  │  [Install]      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Step 2 — Installation
Clicking "Install" triggers a confirmation modal that shows:
- What the plugin does
- How many credits it will cost (setup + ongoing)
- What permissions it needs (e.g., "Write to your project's plugin data namespace")

On confirm:
1. A new Firestore document is created:
   ```
   projects/{projectId}/plugins/devos-auth
   ```
   with fields: `name`, `version`, `installedAt`, `status: "provisioning"`, `config: {}`.

2. A Cloud Function is triggered that:
   - Allocates a unique project API key (a random, unguessable string)
   - Stores it encrypted in Firestore Secret Manager or as a hashed field
   - Creates an entry in `plugin_data/{projectId}/` to initialise the namespace
   - Updates the plugin document: `status: "active"`, `apiKey: "<public-key>"`

3. The project's `env` field (already present on the `Project` type as `env?: Record<string, string>`) is updated with the plugin's public key:
   ```json
   {
     "DEVOS_AUTH_KEY": "proj_abc123_pub_xxxx",
     "DEVOS_DB_KEY":   "proj_abc123_pub_yyyy"
   }
   ```

4. A `<script>` tag is auto-injected into the project's `index.html` entry file (similar to how templates inject boilerplate today) with the SDK URL and the key pre-filled.

### Step 3 — In the IDE
After installation the Plugins sidebar tab shows the installed plugin's management panel (described above for each plugin). The developer can immediately use it without leaving the IDE.

### Step 4 — In Production
When the developer's project is deployed (via `devos.name.ng`), the plugin SDK communicates directly with DevOS's Cloud Function endpoints. The developer's app never has direct Firestore/Storage access — only the SDK can talk to the backend, using the scoped API key. This provides:
- **Isolation**: one project's data cannot access another's
- **Rate limiting**: the Cloud Function can throttle abusive clients
- **Auditability**: every SDK call is logged in `plugin_data/{projectId}/audit_log`

### Step 5 — Uninstallation
The developer can uninstall a plugin from the IDE panel. They are warned that this will:
- Invalidate the API key immediately (all SDK calls fail)
- Optionally delete all plugin data (a separate "Delete all data" checkbox, off by default)
- Remove the `<script>` tag from `index.html`

---

## Data Model (Firestore)

```
projects/{projectId}
  └── plugins/                         ← new subcollection
        └── {pluginId}                 ← e.g. "devos-auth", "devos-db", "devos-storage"
              name:        string
              version:     string
              status:      "provisioning" | "active" | "paused" | "error"
              installedAt: Timestamp
              apiKey:      string       ← public key; secret key in Secret Manager
              config:      {
                // auth-specific
                allowedMethods:  string[]     // ["email", "google", "github"]
                requireVerification: boolean

                // database-specific
                schema:          object        // collection rules JSON
                collectionsUsed: string[]

                // storage-specific
                maxFileSizeMB:   number
                policies:        Record<string, "public"|"authenticated"|"private">
              }
              usage: {
                thisMonth: {
                  authSignIns:    number
                  dbReads:        number
                  dbWrites:       number
                  storageBytes:   number
                  bandwidthBytes: number
                }
              }

plugin_data/{projectId}/
  └── auth/
        └── users/{appUserId}
              email:          string
              displayName:    string
              createdAt:      Timestamp
              lastSignIn:     Timestamp
              disabled:       boolean
              provider:       "email" | "google" | "github"

  └── db/
        └── {collectionName}/{documentId}
              ...developer-defined fields...

  └── storage_meta/
        └── {fileId}
              path:       string        // relative path within project namespace
              size:       number
              mimeType:   string
              uploadedAt: Timestamp
              uploadedBy: string        // appUserId from DevOS Auth (if installed)
              policy:     string        // "public" | "authenticated" | "private"
```

---

## Marketplace Listing Model

Each plugin is a first-party offering made by the DevOS team, but the infrastructure should be designed so that **third-party plugins** can be added later. The marketplace document shape in Firestore would be:

```
marketplace/
  └── {pluginId}
        id:           string            // "devos-auth"
        name:         string            // "DevOS Auth"
        tagline:      string            // "Add user login in 60 seconds"
        description:  string            // markdown body
        iconUrl:      string
        category:     "auth" | "database" | "storage" | "ai" | "payments" | "email"
        author:       "devos" | string  // uid for third-party plugins
        version:      string            // semver "1.2.0"
        sdkUrl:       string            // CDN link to the SDK bundle
        docsUrl:      string
        creditCost:   {
          install:    number            // one-time setup credits (0 = free)
          monthly:    number            // flat monthly charge in credits
          perUnit:    Record<string, number>  // e.g. { "auth.signIn": 0.1 }
        }
        isOfficial:   boolean
        isVerified:   boolean           // for future third-party plugins
        installCount: number
        rating:       number            // 0–5, from user reviews
        tags:         string[]
        createdAt:    Timestamp
        updatedAt:    Timestamp
```

---

## Security Architecture

### API Keys — Two-Key Model
Each plugin installation has two keys:

| Key | Purpose | Where stored |
|-----|---------|--------------|
| **Public key** | Identifies the project in SDK calls; safe to embed in client HTML | Project `env`, injected into `index.html` |
| **Secret key** | Used only by server-side code (Cloud Functions) to perform privileged operations like user creation | Firebase Secret Manager; never exposed to client |

### Namespace Isolation
All plugin data lives under `plugin_data/{projectId}/`. Firestore security rules ensure:
```
match /plugin_data/{projectId}/{rest=**} {
  // Only the Cloud Function (via Admin SDK) and the project's plugin panel (authenticated IDE user)
  // can read/write here.
  allow read, write: if false;  // locked to server-side access only
}
```
Client-side SDK calls never hit Firestore directly — they go through a Cloud Function that validates the public API key, enforces rate limits and schema rules, then performs the Firestore operation with the Admin SDK.

### Credit Deduction
Plugin operations deduct from the project owner's DevOS credits using the existing `CREDIT_COSTS` system in `src/lib/creditsService.ts`. New cost keys would be added:
```ts
export const CREDIT_COSTS = {
  // ... existing costs ...
  pluginAuthSignIn:    1,
  pluginDbRead:        0,   // free tier up to daily limit
  pluginDbWrite:       1,
  pluginStorageUpload: 0,   // free
  pluginStorageGB:     5,   // per GB per month
};
```

---

## How This Relates to the Existing Codebase

| Existing system | How the plugin marketplace builds on it |
|---|---|
| `src/lib/firebase.ts` | The Admin SDK (server-side) is the same Firebase project; plugins reuse existing infrastructure |
| `src/lib/storageService.ts` | DevOS Storage plugin uses the same `uploadImage()` pattern but under `plugin_uploads/` |
| `Project.env` field (`src/types.ts:48`) | Plugin API keys are stored here and injected into the sandbox |
| `src/lib/creditsService.ts` | Plugin usage deducts from the same credit wallet; new `CREDIT_COSTS` entries added |
| `projects/{id}/files` subcollection | Installer auto-edits `index.html` to inject SDK `<script>` tags |
| `src/lib/rbacService.ts` | Org members with `developer` role or above can install plugins on org projects |
| `src/pages/AdminDashboard.tsx` | A new "Plugins" admin tab would show marketplace listings, usage totals, and abuse flags |
| `src/types.ts` — `Template` interface | Plugin boilerplate code could be shipped as official Templates pre-wired for each plugin |

---

## Implementation Phases (When We Build It)

### Phase 1 — Marketplace UI (no real backend yet)
- Add `/plugins` route and a `PluginsPage.tsx` listing cards
- Add a "Plugins" sidebar tab in the IDE (empty/coming-soon state)
- Add `marketplace` collection to Firestore with the three plugin documents
- Admin dashboard "Plugins" tab to manage listings

### Phase 2 — DevOS Database (lowest risk, no OAuth needed)
- Cloud Function: `pluginDbProxy` — validates API key, enforces schema rules, executes Firestore CRUD
- IDE "Database" panel in sidebar: collection browser + schema editor
- `devos-db.js` SDK on the CDN
- Plugin installer: provisions namespace, injects env var + script tag
- Credit metering for reads/writes

### Phase 3 — DevOS Storage
- Cloud Function: `pluginStorageProxy` — validates key, checks policy, returns signed upload/download URLs
- IDE "Storage" panel: file browser, upload, delete, policy editor
- `devos-storage.js` SDK
- Credit metering for bandwidth and storage bytes

### Phase 4 — DevOS Auth (most complex — needs OAuth app registrations)
- Cloud Function: `pluginAuthProxy` — email/password sign-in, token issuance (JWT)
- OAuth flows for Google/GitHub (DevOS registers its own OAuth app with a redirect to the proxy function)
- IDE "Auth" panel: user list, disable/delete, method toggles
- `devos-auth.js` SDK with `onAuthStateChanged` real-time listener
- Credit metering for sign-ins and active users

### Phase 5 — Third-Party Plugins
- Plugin submission form for external developers
- SDK verification / sandboxing requirements
- Revenue split model (DevOS takes a platform cut of credits charged)
- User reviews and ratings

---

## Summary

The Plugin Marketplace turns DevOS from a **code editor + deployment tool** into a **full-stack development platform**. Developers never leave the IDE to add auth, a database, or file storage to their apps. Everything is provisioned automatically, billed via the existing credit system, and managed through a visual panel alongside their code.

The three first-party plugins — **DevOS Auth**, **DevOS Database**, and **DevOS Storage** — map cleanly onto infrastructure that already exists in the platform (Firebase Auth, Firestore, Firebase Storage + Supabase). The main work is:
1. Writing the Cloud Function proxies that enforce isolation and rate-limiting
2. Building the client-side SDK bundles
3. Building the IDE management UI panels
4. Wiring the installer to the project's `env` field and `index.html`

None of this requires replacing or changing the core DevOS platform data model — it sits alongside it in a dedicated `plugin_data/` namespace.
