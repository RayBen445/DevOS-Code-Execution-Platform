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

---

## Additional Plugins (Planned)

Beyond the three core plugins, the following plugins are planned for the DevOS Plugin Marketplace. Each follows the same installation model: one click in the IDE, SDK injected automatically, credits deducted per use.

---

### 4. DevOS Email

**Category:** Communication | **Status:** Planned — Phase 6

Send transactional and marketing emails directly from your project without configuring an SMTP server.

**What it provides:**
- `devos.email.send({ to, subject, html })` — send a single email
- `devos.email.sendTemplate(templateKey, vars)` — merge-field templates stored in the plugin panel
- React Email-style visual template editor in the IDE panel
- Delivery receipts and open/click tracking
- Unsubscribe link management (CAN-SPAM / GDPR compliant)

**Credit cost:** 1 credit per 10 emails | **IDE panel:** Template editor, delivery logs, bounce dashboard

---

### 5. DevOS Realtime

**Category:** Data / Sync | **Status:** Planned — Phase 6

Add live real-time data sync to any project — chat, live dashboards, collaborative editing — without running a WebSocket server.

**What it provides:**
- `devos.realtime.subscribe(channel, callback)` — listen for live updates
- `devos.realtime.publish(channel, data)` — broadcast data to all subscribers
- Presence tracking: who is online in a channel
- Channel history (last N messages)
- Client SDK for React, Vanilla JS, and Vue

**Credit cost:** 1 credit per 1,000 messages | **IDE panel:** Channel browser, message inspector, subscriber count

---

### 6. DevOS Search

**Category:** Data / Discovery | **Status:** Planned — Phase 7

Full-text search for your project's content — products, posts, documents — with zero ElasticSearch setup.

**What it provides:**
- `devos.search.index(collection, document)` — index a document
- `devos.search.query(collection, queryString, options)` — search with facets, filters, ranking
- Auto-indexing: connect a Firestore collection and DevOS Search mirrors it automatically
- Fuzzy matching, typo tolerance, synonym support
- Highlight snippets in results

**Credit cost:** Free indexing; 1 credit per 100 queries | **IDE panel:** Index browser, query tester, synonym manager

---

### 7. DevOS Cron

**Category:** Automation | **Status:** Planned — Phase 6

Schedule recurring jobs that run on a timer and call your project's endpoints or internal functions.

**What it provides:**
- Visual cron scheduler in the IDE (no cron syntax required)
- `devos.cron.register(name, schedule, handler)` — programmatic registration
- Execution history and failure alerts
- Retry with backoff on failure
- Full timezone support

**Credit cost:** 1 credit per job execution | **IDE panel:** Job list, schedule editor, execution logs

---

### 8. DevOS Webhooks

**Category:** Integration | **Status:** Planned — Phase 6

Receive incoming webhooks from external services (Stripe, GitHub, Slack, etc.) and route them to your project's handler functions.

**What it provides:**
- Generates a unique `https://hooks.devos.name.ng/{projectId}/{endpoint}` URL
- Signature verification for popular providers (Stripe, GitHub, Shopify, Twilio)
- Payload inspector and replay in the IDE
- Fan-out: one incoming webhook → multiple handler functions
- Automatic retries with backoff

**Credit cost:** Free receiving; 1 credit per 100 dispatches | **IDE panel:** Endpoint manager, payload inspector, delivery history

---

### 9. DevOS Analytics

**Category:** Insights | **Status:** Planned — Phase 7

Privacy-first, cookie-free analytics for your deployed project — without sending data to Google.

**What it provides:**
- Auto-injected `<script>` tag (zero-config)
- `devos.analytics.track(eventName, properties)` — custom event tracking
- Dashboard in the IDE: page views, unique visitors, top pages, referrers, countries
- Funnel analysis and goal conversion tracking
- CSV data export

**Credit cost:** Free up to 10,000 events/mo; 1 credit per 1,000 above | **IDE panel:** Charts, event explorer, funnel builder

---

### 10. DevOS Payments

**Category:** Commerce | **Status:** Planned — Phase 8

Accept payments in your project via Stripe, with no server-side code required.

**What it provides:**
- `devos.payments.createCheckout(items)` — creates a Stripe Checkout session URL
- `devos.payments.onPaymentSuccess(callback)` — real-time success event
- Subscription management: create, update, cancel plans
- Webhook auto-verification (Stripe signature checked by the proxy function)
- Revenue dashboard in the IDE

**Credit cost:** 2 credits per transaction | **IDE panel:** Product/plan editor, transaction log, revenue chart

---

### 11. DevOS AI

**Category:** Intelligence | **Status:** Planned — Phase 7

Add AI-powered features (text generation, image generation, embeddings, classification) to your project with a single SDK call.

**What it provides:**
- `devos.ai.complete(prompt, options)` — text completion (GPT-4, Claude, Gemini)
- `devos.ai.embed(text)` — vector embeddings for semantic search
- `devos.ai.classify(text, labels)` — zero-shot classification
- `devos.ai.image(prompt, options)` — image generation (DALL-E 3, Stable Diffusion)
- Model selector in the IDE panel

**Credit cost:** 5 credits per 1k tokens; 10 credits per image | **IDE panel:** Prompt playground, usage dashboard, model selector

---

### 12. DevOS Queue

**Category:** Backend / Async | **Status:** Planned — Phase 7

Durable background job queue for async processing — image resizing, bulk emails, report generation.

**What it provides:**
- `devos.queue.enqueue(jobType, payload, options)` — add a job
- `devos.queue.define(jobType, handler)` — register a handler function
- Job priority, delay, and retry settings
- Dead-letter queue for failed jobs
- Job status polling: `devos.queue.status(jobId)`

**Credit cost:** 1 credit per 10 jobs | **IDE panel:** Queue browser, dead-letter inspector, throughput chart

---

### 13. DevOS CMS

**Category:** Content | **Status:** Planned — Phase 8

A headless content management system built into your IDE.

**What it provides:**
- Visual content model builder (fields, types, validations)
- `devos.cms.get(contentType, id)` — fetch a single entry
- `devos.cms.list(contentType, options)` — list with filters, sort, pagination
- Media library (powered by DevOS Storage)
- Content scheduling (publish at a future date)
- Webhooks on content publish/update

**Credit cost:** Free reads; 1 credit per 100 writes | **IDE panel:** Content model editor, content editor, media library

---

### 14. DevOS Push Notifications

**Category:** Communication | **Status:** Planned — Phase 7

Send browser push notifications and FCM mobile notifications to your users.

**What it provides:**
- `devos.push.subscribe(userId)` — request push permission and store the subscription
- `devos.push.send(userId, { title, body, url })` — send to a specific user
- `devos.push.broadcast({ title, body })` — send to all subscribers
- Topic subscriptions for segmented sends

**Credit cost:** 1 credit per 100 pushes | **IDE panel:** Subscriber list, send composer, delivery report

---

### 15. DevOS Geo

**Category:** Location | **Status:** Planned — Phase 8

Geocoding, reverse geocoding, distance calculation, and geofencing.

**What it provides:**
- `devos.geo.geocode(address)` — address → lat/lng
- `devos.geo.reverse(lat, lng)` — lat/lng → formatted address
- `devos.geo.distance(from, to)` — great-circle distance
- `devos.geo.withinRadius(center, radiusKm, points)` — geofencing
- Embeddable OpenStreetMap component (no Google API key needed)

**Credit cost:** 1 credit per 50 geocode requests | **IDE panel:** Map preview, geocode tester

---

### 16. DevOS A/B Testing

**Category:** Optimisation | **Status:** Planned — Phase 8

Run controlled experiments on your project without a third-party service.

**What it provides:**
- `devos.ab.variant(experimentName, userId)` — returns `"A"` or `"B"` (deterministic per user)
- `devos.ab.track(experimentName, userId, goal)` — record a conversion
- Statistical significance calculation
- Configurable traffic splits
- Experiment scheduler (start/end dates)

**Credit cost:** Free up to 5 active experiments | **IDE panel:** Experiment manager, results dashboard with significance

---

### 17. DevOS Forms

**Category:** Data Collection | **Status:** Planned — Phase 7

Embed forms and collect submissions without a backend.

**What it provides:**
- Visual drag-and-drop form builder in the IDE
- `devos.forms.submit(formId, data)` — programmatic submission
- Auto-generated embeddable iframe and React component
- Spam protection (CAPTCHA, honeypot)
- Email notifications on new submissions
- CSV export of all submissions

**Credit cost:** Free up to 100 submissions/mo; 1 credit per 10 above | **IDE panel:** Form builder, submission inbox, export

---

### 18. DevOS I18n

**Category:** Localisation | **Status:** Planned — Phase 9

Manage translations for your project from the IDE, with AI-assisted suggestions.

**What it provides:**
- `devos.i18n.t(key, locale)` — translate a string
- `devos.i18n.setLocale(locale)` — switch locale at runtime
- Side-by-side translation editor in the IDE
- AI-assisted translation for 50+ languages
- Missing key detection

**Credit cost:** 5 credits per AI-translated string; manual translations free | **IDE panel:** Translation editor, missing keys report

---

### 19. DevOS Feature Flags

**Category:** Release Management | **Status:** Planned — Phase 8

Roll out new features gradually and target specific users without redeploying.

**What it provides:**
- `devos.flags.isEnabled(flagName, userId?)` — check a flag
- Percentage rollouts (e.g. enable for 10% of users)
- User targeting by attribute (e.g. `plan === "pro"`)
- Kill switch: instantly disable without a redeploy
- Flag audit log

**Credit cost:** Free | **IDE panel:** Flag manager, targeting rules editor, rollout slider

---

### 20. DevOS Audit Log

**Category:** Compliance | **Status:** Planned — Phase 9

Immutable, tamper-evident audit trail of all actions in your project.

**What it provides:**
- `devos.audit.log(action, userId, metadata)` — record an event
- Auto-instrumentation for DevOS Auth actions
- Immutable write-once storage
- Searchable log viewer in the IDE
- CSV/JSON export with date range filters

**Credit cost:** 1 credit per 1,000 entries | **IDE panel:** Log viewer with search, export button

---

## Plugin Comparison Table

| # | Plugin | Category | Phase | Free Tier | Credits |
|---|--------|----------|-------|-----------|---------|
| 1 | DevOS Auth | Identity | 4 | 100 sign-ins/mo | 1 per sign-in above |
| 2 | DevOS Database | Data | 2 | 1,000 reads/day | 1 per write |
| 3 | DevOS Storage | Files | 3 | 1 GB | 5 per GB/mo |
| 4 | DevOS Email | Communication | 6 | 100 emails/mo | 1 per 10 emails |
| 5 | DevOS Realtime | Data/Sync | 6 | 10,000 msgs/mo | 1 per 1,000 msgs |
| 6 | DevOS Search | Discovery | 7 | 10,000 queries/mo | 1 per 100 queries |
| 7 | DevOS Cron | Automation | 6 | 10 jobs/mo | 1 per execution |
| 8 | DevOS Webhooks | Integration | 6 | Unlimited receive | 1 per 100 dispatched |
| 9 | DevOS Analytics | Insights | 7 | 10,000 events/mo | 1 per 1,000 events |
| 10 | DevOS Payments | Commerce | 8 | — | 2 per transaction |
| 11 | DevOS AI | Intelligence | 7 | 100 credits | 5 per 1k tokens |
| 12 | DevOS Queue | Backend | 7 | 100 jobs/mo | 1 per 10 jobs |
| 13 | DevOS CMS | Content | 8 | Free reads | 1 per 100 writes |
| 14 | DevOS Push | Communication | 7 | 1,000 pushes/mo | 1 per 100 pushes |
| 15 | DevOS Geo | Location | 8 | 100 geocodes/mo | 1 per 50 requests |
| 16 | DevOS A/B Testing | Optimisation | 8 | 5 experiments | Free |
| 17 | DevOS Forms | Data Collection | 7 | 100 submissions/mo | 1 per 10 submissions |
| 18 | DevOS I18n | Localisation | 9 | Manual free | 5 per AI string |
| 19 | DevOS Feature Flags | Release Mgmt | 8 | Unlimited | Free |
| 20 | DevOS Audit Log | Compliance | 9 | 10,000 entries/mo | 1 per 1,000 entries |
