# DevOS — Testing Guide

This document explains how to set up a test account and run manual QA scenarios on DevOS.

> ⚠️ **Security note:** Never commit real credentials to this file or to any file in the repository.  
> The credentials below are **placeholders**. Replace them with values you create yourself — do not share real passwords publicly.

---

## 🔑 Test Account Setup

A shared test account should be created once by a project maintainer and the credentials stored in a **secure secrets manager** (e.g. 1Password, Bitwarden, GitHub Secrets) — not in this file.

### Creating the test account

1. Go to the running DevOS instance (local: `http://localhost:5173`, production: your deployment URL).
2. Click **Sign up** and register with the following placeholder details — replace with real values and store them securely:

| Field | Placeholder value |
|---|---|
| Email | `devos-tester@example.com` |
| Password | *(set a strong password — store in your secrets manager)* |
| Full name | `DevOS Tester` |
| Username | `devos_tester` |

3. After signing up, the account will have standard user permissions and the default credit allowance.

### Creating a test Admin account

To test admin features (Admin Dashboard, ban/suspend, gifted credits, polls, maintenance mode):

1. Set `VITE_ADMIN_EMAIL` in your `.env.local` to the email of the admin test account.
2. Register or log in with that email — the platform will automatically assign the `admin` role on first sign-in.
3. Admin accounts display **∞ Unlimited** in the credits panel and bypass all credit deductions.

---

## ✅ Manual Test Scenarios

### IDE & Editor
- [ ] Open a project → confirm **project homepage** shows (file browser, tech-stack badges, README preview if present)
- [ ] Click a file from the homepage → confirm it opens in the editor with correct breadcrumb `@username / project / filename`
- [ ] Edit a file → confirm **auto-save** triggers after ~2.5 s (Saved ✓ indicator)
- [ ] Press **Save** manually → confirm a version snapshot is created in Firestore
- [ ] Open terminal → run `save`, `deploy`, `run`, `help` commands
- [ ] Upload a ZIP file → confirm files are populated in the editor

### Deployment
- [ ] Click **Deploy** → confirm a live URL is generated and the project becomes public
- [ ] Visit the live URL → confirm the preview renders correctly
- [ ] Use **Git Sync** (Git panel) → confirm files are pushed to a GitHub repo with correct relative paths (no leading slashes)

### Credits
- [ ] Perform an action (e.g. create project) → confirm credits are deducted
- [ ] As admin → confirm **∞ Unlimited** badge is shown, no credits deducted
- [ ] Admin: Gift credits to test user with an expiry date → confirm they appear and are consumed FIFO
- [ ] Admin: Grant Unlimited Pass → confirm test user sees unlimited badge until expiry

### Admin Dashboard
- [ ] Users tab → Ban / Suspend / Reinstate a user with ConfirmModal
- [ ] Credits tab → Gift Credits and Unlimited Pass forms work
- [ ] Polls tab → Create poll, add options, view vote bars, close/delete
- [ ] Overview tab → Toggle maintenance mode, set banner message
- [ ] Per-page maintenance → Enable maintenance on `/explore` → visit it as a non-admin → confirm maintenance banner shown

### Profile & Portfolio
- [ ] Edit profile → confirm `birthday` is **not** stored in the public `users` document (check Firestore directly)
- [ ] Publish portfolio → confirm `/u/<username>` shows the updated portfolio
- [ ] Activity streak → log in on consecutive days → confirm `dailyStreak` increments
- [ ] Monthly streak → reach 20 active days → confirm `monthlyStreak` increments **once** for the month

### Organizations
- [ ] Create an org → invite a member → confirm `/org/<slug>` shows the org page
- [ ] As a guest (logged out) → visit org page → confirm no permission-denied error (member list hidden for guests)

### Social / Feed
- [ ] Post to feed → like a post → confirm `likedBy` updates correctly
- [ ] Comment on a post → delete the comment

---

## 🐛 Reporting Issues

Found a bug during testing? Email **info@devos.zone.id** with:
- Steps to reproduce
- Expected vs. actual behaviour
- Browser + OS
- Screenshot or screen recording if possible

We respond within 48 hours.
