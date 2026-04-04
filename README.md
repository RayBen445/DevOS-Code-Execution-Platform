<div align="center">
<img width="1200" height="475" alt="DevOS Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DevOS — Cloud Code Execution Platform

**DevOS** is a production-grade, browser-based IDE and deployment platform. Write, run, and ship projects without installing anything — inspired by the best of Vercel, GitHub, and Notion.

> Built with React + TypeScript · Firebase/Firestore · Express · Monaco Editor · Socket.IO

---

## ✨ Features

### 🖥️ IDE & Editor
- **Monaco-powered editor** with syntax highlighting for HTML, CSS, JS, TS, JSON, Markdown, and more
- **GitHub-style project homepage** — when no file is open the IDE shows a rich project overview with file browser, tech-stack badges, and a live README preview
- **`@username / project / filename` breadcrumb** in the editor header, matching GitHub's navigation pattern
- **File tabs** with unsaved-change indicators, per-project last-open file memory
- **Auto-save** (2.5 s debounce) + manual **Save** button with `Saving… / Saved ✓` status
- **Version snapshots** — every manual save writes a timestamped snapshot to Firestore
- **Live Preview panel** — renders HTML/CSS/JS in a sandboxed iframe, updates on save
- **Resizable terminal** with `save`, `deploy`, `sync`, `run`, `clear`, `help` commands
- **Focus mode** — collapses all panels for distraction-free coding
- **ZIP import** — drag-drop or upload a `.zip` to populate the project file system

### 🚀 Deployment
- One-click **Deploy** to a live URL: `devos.zone.id/u/<username>/<project-slug>`
- **Git Sync** — push files directly to a GitHub repository via the Git panel (paths are normalized before creating tree objects)
- **Deploy modal** with domain preview and copy-to-clipboard URL

### 👤 Profiles & Portfolio
- Personal portfolio at `/u/<username>` with bio, featured projects, skills, and social links
- **Portfolio Editor** with live preview before publishing
- **Share as Image** — export your portfolio card as a PNG
- **Activity streaks** — daily and monthly coding streaks with 20-day monthly milestone award (awarded once per calendar month)

### 🌐 Community & Social
- **Feed** — post updates, like, comment, and repost projects
- **Explore** page with search filters
- **Follow / Unfollow** users
- **Communities** — create or join topic-based groups
- **Organizations** — create orgs with members, roles (owner / admin / member), and a public page at `/org/<slug>`

### 💳 Credits Economy
- **Daily credits** (reset every 24 h) + **Monthly credits** (reset each calendar month)
- **Gifted credits** with optional expiry — drained FIFO (oldest first) before regular credits
- **Unlimited Pass** — admin can grant a time-limited unlimited-credits pass to any user
- **Redeem Codes** — promo codes that grant bonus credits
- All deductions are **atomic** (Firestore transaction) — no race conditions or over-spending
- **Admin bypass** — admin users have ∞ unlimited credits; the navbar shows an `∞ Unlimited` badge

### 🔔 Notifications
- Real-time in-app notification bell — new followers, comments, and system alerts

### 🔧 Admin Dashboard
- **Users tab** — search users, Ban / Suspend / Reinstate with confirmation modal
- **Credits tab** — Gift Credits (amount + expiry) and grant Unlimited Passes
- **Polls tab** — create polls, build option lists, view live vote bars, close or delete polls
- **Overview tab** — maintenance mode quick-toggle, platform-wide banner message
- **Per-page maintenance** — disable specific routes without a full platform shutdown

### 🔒 Security & Rules
- Firestore security rules covering all collections: `users`, `user_settings`, `projects`, `templates`, `user_credits`, `notifications`, `redeem_codes`, `feed`, `comments`, `organizations`, `follows`, `referral_codes`, `referrals`
- `birthday` stored only in private `user_settings` — never exposed in the public `users` document
- `likedBy` field access uses `.get('likedBy', []).toSet()` safe defaults to prevent rule errors on legacy docs
- `/api/run` code execution scoped to an isolated temp directory with a 10-second timeout

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Backend | Express, tsx (runtime TypeScript) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Realtime | Socket.IO |
| Animation | Framer Motion |
| AI | Google Gemini (`@google/genai`) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A Firebase project (Firestore, Auth, Storage enabled)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/RayBen445/DevOS-Code-Execution-Platform.git
cd DevOS-Code-Execution-Platform

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local
# Fill in VITE_FIREBASE_*, GEMINI_API_KEY, ADMIN_EMAIL etc.

# 4. Start dev server (Vite + Express)
npm run dev
```

The app runs at `http://localhost:5173` (or the port Vite assigns).

### Build for Production

```bash
npm run build     # Vite frontend build → dist/
npm start         # Serve with Express (dist/server.js)
```

### Lint / Type-check

```bash
npm run lint      # tsc --noEmit
```

---

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firestore project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `GEMINI_API_KEY` | Google Gemini API key |
| `VITE_ADMIN_EMAIL` | Email address granted the `admin` role on first login |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID (for Git Sync) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `JWT_SECRET` | Secret used to sign GitHub OAuth state tokens |

---

## 🧪 Testing

See **[TESTING.md](./TESTING.md)** for instructions on setting up a test account and running manual test scenarios.

---

## 📄 License

© Cool Shot Systems / Tech Visionaries Network. All rights reserved.
