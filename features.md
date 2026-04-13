# DevOS — Feature Preview

This page tracks the status of every feature in the DevOS platform. Features progress through **Preview → Beta → Generally Available (GA)**. Some are on the roadmap but not yet started.

## Status Legend

| Status | Meaning |
|--------|---------|
| 🟢 **GA** | Generally Available — live for all users |
| 🔵 **Beta** | Live but may change; opt-in or gradual rollout |
| 🟡 **Preview** | Limited access / behind a flag |
| 🔴 **Planned** | On the roadmap, not yet started |
| ⚫ **Deprecated** | Being removed |

---

## IDE & Code Editor

| Feature | Status |
|---------|--------|
| Multi-file project IDE with tabs | 🟢 GA |
| Monaco editor with syntax highlighting | 🟢 GA |
| In-browser terminal (DevOS Terminal) | 🟢 GA |
| Live preview panel | 🟢 GA |
| File tree explorer | 🟢 GA |
| Git panel (commits, branches, PRs) | 🟢 GA |
| Focus mode (distraction-free editor) | 🟢 GA |
| Plugin Marketplace (install backend services) | 🔵 Beta |
| Branch management & PR merging | 🔵 Beta |
| Split-pane editor | 🔴 Planned |
| Offline mode (service worker) | 🔴 Planned |

## Deployment & Hosting

| Feature | Status |
|---------|--------|
| One-click deploy with public URL | 🟢 GA |
| Custom subdomain (`username.devos.name.ng`) | 🟢 GA |
| Deployment history & rollback | 🟢 GA |
| Build status badges | 🟢 GA |
| CDN-backed static hosting (Supabase Storage) | 🟢 GA |
| Custom domain mapping (CNAME) | 🔴 Planned |
| Server-side functions | 🔴 Planned |

## Plugin System

| Feature | Status |
|---------|--------|
| DevOS Auth (sign-up/sign-in for your app) | 🔵 Beta |
| DevOS Database (Firestore-backed doc DB) | 🔵 Beta |
| DevOS Storage (file/image uploads) | 🔵 Beta |
| DevOS Email (transactional email) | 🟡 Preview |
| DevOS Realtime (WebSocket pub/sub) | 🟡 Preview |
| DevOS Queue (background jobs) | 🟡 Preview |
| DevOS Webhooks (incoming/outgoing) | 🟡 Preview |
| DevOS Push Notifications | 🔴 Planned |
| DevOS Feature Flags | 🔴 Planned |
| DevOS Analytics | 🔴 Planned |
| DevOS Search | 🔴 Planned |
| DevOS Forms | 🔴 Planned |

> **Domain note:** No new domain needed — all plugin APIs live at `api.devos.name.ng`. The existing `devos.name.ng` domain handles everything via subdomains. CDN uses Supabase Storage (already configured).

## Collaboration & Organizations

| Feature | Status |
|---------|--------|
| Real-time multi-cursor presence | 🟢 GA |
| Organization workspaces | 🟢 GA |
| Role-based access control (owner/admin/developer/viewer) | 🟢 GA |
| Collaborators panel with presence | 🟢 GA |
| Pull request workflow | 🔵 Beta |
| Voice/video calls in org workspace | 🔴 Planned |

## Social & Community

| Feature | Status |
|---------|--------|
| Public project feed | 🟢 GA |
| Follow system | 🟢 GA |
| Communities | 🟢 GA |
| Events & speakers | 🟢 GA |
| Feed posts (text, code snippets, project updates) | 🟢 GA |
| Reposts & likes | 🟢 GA |
| @mentions in posts & comments | 🟢 GA |
| Polls | 🟢 GA |
| Auto-post to feed on project create/deploy | 🔵 Beta |

## Learning Platform

| Feature | Status |
|---------|--------|
| Interactive lessons with live code execution | 🟢 GA |
| JavaScript, TypeScript, HTML/CSS tracks | 🟢 GA |
| Progress tracking (per-user) | 🟢 GA |
| Python, Go, Rust tracks | 🔴 Planned |
| Certificates of completion | 🔴 Planned |
| Community-submitted lessons | 🔴 Planned |

## Bot System

| Feature | Status |
|---------|--------|
| Deploy Bot | 🟢 GA |
| Credit Bot | 🟢 GA |
| Feed Bot | 🟢 GA |
| Notification Bot | 🟢 GA |
| Welcome Bot (signup bonus, onboarding) | 🟢 GA |
| Activity Bot (project timeline) | 🟢 GA |
| Milestone Bot (badges & achievements) | 🟢 GA |
| Moderation Bot (spam/content filtering) | 🟢 GA |
| Plugin Bot | 🟢 GA |
| Search Index Bot | 🟢 GA |
| Project Health Bot (code quality checks) | 🟢 GA |
| Debug Bot | 🟢 GA |

## Accessibility & Settings

| Feature | Status |
|---------|--------|
| Dark/light/midnight/ocean/sunset themes | 🟢 GA |
| Keyboard shortcuts reference | 🟢 GA |
| Font size preferences | 🟢 GA |
| Keyboard shortcut customisation | 🔴 Planned |
| Screen reader improvements | 🔴 Planned |

## Admin & Platform

| Feature | Status |
|---------|--------|
| Admin dashboard (users, credits, templates, etc.) | 🟢 GA |
| Credit system | 🟢 GA |
| Referral system | 🟢 GA |
| Site config (platform name, footer, links) | 🟢 GA |
| Email queue | 🟢 GA |
| Maintenance mode | 🟢 GA |

---

## Feedback

Have a feature request or found something broken? Post on the [DevOS feed](https://devos.name.ng) or create an issue in the project repository. Your feedback shapes the roadmap.
