# DevOS — Email Reference

All email flows, addresses, templates, and setup instructions for the DevOS platform.

---

## Platform Email Addresses

| Address | Purpose |
|---|---|
| `info@devos.zone.id` | General enquiries, contact form |
| `privacy@devos.zone.id` | Privacy requests, GDPR / data subject rights |
| `legal@devos.zone.id` | Legal notices, copyright queries |
| `dmca@devos.zone.id` | DMCA takedown requests |
| `security@devos.zone.id` | Vulnerability disclosures, security reports |
| `abuse@devos.zone.id` | Report platform abuse or harmful content |
| `appeals@devos.zone.id` | Account ban / suspension appeals |

The admin account is set via the environment variable `VITE_ADMIN_EMAIL`.

---

## 1. Firebase Auth Emails (automatic)

These are sent automatically by Firebase Authentication with no extra code required. Customise them in the Firebase console under **Authentication → Templates**.

### 1.1 Email Verification
- **Trigger:** immediately after `createUserWithEmailAndPassword`
- **Sent to:** the new user's email address
- **Purpose:** confirm the user owns the address
- **Customise:** Firebase Console → Authentication → Templates → Email address verification

> **Current status:** email verification is not yet enforced in the app. Users can sign in without verifying. To enforce it, check `user.emailVerified` after sign-in and redirect unverified users to a verification prompt.

### 1.2 Password Reset
- **Trigger:** called via `sendPasswordResetEmail(auth, email)`
- **Sent to:** the address the user enters
- **Purpose:** let users reset a forgotten password
- **Customise:** Firebase Console → Authentication → Templates → Password reset

> **Current status:** no "Forgot password?" link is exposed in the Login modal. To add one, import `sendPasswordResetEmail` from `"firebase/auth"` and wire it to a button in `src/components/Login.tsx`.

### 1.3 Email Address Change
- **Trigger:** called via `verifyBeforeUpdateEmail(user, newEmail)` or `updateEmail(user, newEmail)`
- **Purpose:** send a re-verification link when a user changes their email
- **Customise:** Firebase Console → Authentication → Templates → Email address change

---

## 2. Transactional Emails (manual / to be implemented)

The following emails are not yet automated. They should be sent manually by the admin, or wired up through a transactional email service (see §4 for setup options).

### 2.1 Welcome Email
- **Trigger:** new user completes registration (`registerUserProfile` in `src/lib/userService.ts`)
- **Sent to:** `user.email`
- **Subject:** `Welcome to DevOS 🚀`

**Template:**
```
Subject: Welcome to DevOS 🚀

Hi {{displayName}},

Your DevOS account is ready.

Username:  @{{username}}
Profile:   https://devos.zone.id/u/{{username}}

Start building:
→ https://devos.zone.id/projects

We're excited to have you.

— The DevOS Team
info@devos.zone.id
```

---

### 2.2 Account Banned
- **Trigger:** admin clicks **Ban User** in AdminDashboard → Users tab
- **Sent to:** the banned user's email
- **Subject:** `Your DevOS account has been suspended`

**Template:**
```
Subject: Your DevOS account has been suspended

Hi {{displayName}},

After a review of your account activity, your DevOS account (@{{username}})
has been permanently suspended for violating our Acceptable Use Policy.

If you believe this is a mistake, you may appeal at:
appeals@devos.zone.id

— DevOS Trust & Safety
abuse@devos.zone.id
```

---

### 2.3 Account Temporarily Suspended
- **Trigger:** admin clicks **Suspend User** in AdminDashboard → Users tab
- **Sent to:** the suspended user's email
- **Subject:** `Your DevOS account has been temporarily suspended`

**Template:**
```
Subject: Your DevOS account has been temporarily suspended

Hi {{displayName}},

Your DevOS account (@{{username}}) has been temporarily suspended.
You will not be able to sign in or use platform features during this period.

To appeal, contact: appeals@devos.zone.id

— DevOS Trust & Safety
```

---

### 2.4 Account Reinstated
- **Trigger:** admin clicks **Reinstate** in AdminDashboard → Users tab
- **Sent to:** the reinstated user's email
- **Subject:** `Your DevOS account has been reinstated`

**Template:**
```
Subject: Your DevOS account has been reinstated ✓

Hi {{displayName}},

Good news — your DevOS account (@{{username}}) has been reinstated.
You can sign in again at https://devos.zone.id.

If you have questions, reply to this email.

— The DevOS Team
info@devos.zone.id
```

---

### 2.5 Username Change Request: Approved
- **Trigger:** admin clicks **Approve** on a username change request (AdminDashboard → Users tab)
- **Function:** `resolveUsernameChangeRequest` + `adminChangeUsername` in `src/lib/userService.ts`
- **Sent to:** requesting user's email
- **Subject:** `Your username change request was approved`

**Template:**
```
Subject: Your username change request was approved ✓

Hi {{displayName}},

Your DevOS username has been changed:

  @{{oldUsername}}  →  @{{newUsername}}

Your new profile URL is:
https://devos.zone.id/u/{{newUsername}}

— The DevOS Team
```

---

### 2.6 Username Change Request: Rejected
- **Trigger:** admin clicks **Reject** on a username change request
- **Sent to:** requesting user's email
- **Subject:** `Your username change request was not approved`

**Template:**
```
Subject: Your username change request was not approved

Hi {{displayName}},

Your request to change your username to @{{requestedUsername}} was not approved.

Reason: {{rejectionReason}}

You can submit a new request from Settings → Profile.

— The DevOS Team
```

---

### 2.7 Account Deletion Request: Received
- **Trigger:** user submits deletion request from Settings → Danger Zone
- **Function:** `requestAccountDeletion` in `src/lib/userService.ts`
- **Sent to:** requesting user's email + `info@devos.zone.id` (admin copy)
- **Subject (user):** `We received your account deletion request`
- **Subject (admin copy):** `[DevOS] New account deletion request from {{email}}`

**User template:**
```
Subject: We received your account deletion request

Hi {{displayName}},

We received your request to delete your DevOS account (@{{username}}).

Our team will review and process your request within 7 days. You will
receive a confirmation email once the deletion is complete.

If you change your mind, contact us at info@devos.zone.id before
the deletion is processed.

— The DevOS Team
```

**Admin copy template:**
```
Subject: [DevOS] New account deletion request

User:    {{displayName}} (@{{username}})
Email:   {{email}}
UID:     {{uid}}
Reason:  {{reason}}
Time:    {{requestedAt}}

Review in the Admin Dashboard → Deletion Requests tab.
```

---

### 2.8 Account Deletion: Completed
- **Trigger:** admin marks a deletion request as "Processed" in the Admin Dashboard
- **Sent to:** the deleted user's email
- **Subject:** `Your DevOS account has been deleted`

**Template:**
```
Subject: Your DevOS account has been deleted

Hi,

Your DevOS account and all associated data have been permanently deleted
as requested.

Thank you for using DevOS.

— The DevOS Team
info@devos.zone.id
```

---

### 2.9 Admin: New Feedback Received
- **Trigger:** user submits feedback via the in-app Feedback modal
- **Sent to:** `info@devos.zone.id` (admin notification)
- **Subject:** `[DevOS Feedback] {{type}}: {{truncatedMessage}}`

**Template:**
```
Subject: [DevOS Feedback] Bug: login page crashes on Safari

Type:    {{type}}       (bug | feature | feedback)
From:    {{userEmail}}
Time:    {{createdAt}}

Message:
{{message}}

Review in the Admin Dashboard → Feedback tab.
```

---

## 3. In-App Notification Emails (future)

These are not yet implemented but represent email digests for platform notifications.

| Notification Type | Email Subject |
|---|---|
| New follower | `@{{follower}} is now following you on DevOS` |
| Comment on post | `@{{commenter}} commented on your post` |
| Post liked | `@{{liker}} liked your post` |
| Post reposted | `@{{reposter}} reposted your post` |
| @mention | `@{{mentioner}} mentioned you on DevOS` |
| Community invite | `You've been invited to join {{community}}` |
| Streak milestone | `🔥 You've hit a {{n}}-day streak on DevOS!` |
| Credits low | `Your DevOS credits are running low` |

To implement, send these from a Firebase Cloud Function triggered by writes to the `notifications` collection, or use the **Trigger Email** Firebase Extension (see §4).

---

## 4. Email Service Setup

### Option A — Firebase Trigger Email Extension (recommended)
1. Go to Firebase Console → **Extensions** → search **Trigger Email**
2. Install and connect your SMTP provider (e.g., SendGrid, Mailgun, Resend)
3. Configure the `mail` collection in Firestore
4. To send an email, write a document to `mail/{id}`:
   ```javascript
   await addDoc(collection(db, "mail"), {
     to: "user@example.com",
     message: {
       subject: "Welcome to DevOS 🚀",
       html: "<p>Hi there!</p>",
     },
   });
   ```
5. Update Firestore rules to allow your backend / admin service account to write to `mail`.

### Option B — Cloud Functions + Resend / SendGrid
1. Create a Cloud Function triggered by Firestore writes (e.g., new doc in `deletion_requests`)
2. Use the [Resend Node SDK](https://resend.com/docs/send-with-nodejs) or [SendGrid](https://sendgrid.com/docs/for-developers/sending-email/quickstart-nodejs/)
3. Store API keys in Firebase Secret Manager (`firebase functions:secrets:set RESEND_API_KEY`)

### Option C — Manual (current)
For low-volume events (e.g., deletion requests), the admin handles email manually using the information visible in the AdminDashboard.

---

## 5. Firebase Auth Email Template Customisation

To match DevOS branding, customise the Firebase Auth email templates:

1. Firebase Console → **Authentication** → **Templates**
2. Select a template (e.g., Password Reset)
3. Click **Edit** (pencil icon)
4. Update:
   - **From name:** `DevOS`
   - **From address:** `noreply@devos.zone.id` (requires domain verification in Firebase)
   - **Reply-to:** `info@devos.zone.id`
   - **Subject / body:** use the templates in §1 above as a starting point

To use a custom domain for auth emails:
- Firebase Console → Authentication → Templates → **Customise action URL**
- Set the action URL to `https://devos.zone.id/__/auth/action`
- Handle the action in `src/App.tsx` or a dedicated route

---

## 6. Environment Variables

| Variable | Description |
|---|---|
| `VITE_ADMIN_EMAIL` | Admin account email; used to assign `role: "admin"` on sign-in |

Add to `.env.local` for local development and to your hosting provider's environment config for production.
