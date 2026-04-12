# DevOS Bot System

Bots are lightweight, event-driven workers that run inside the DevOS platform and react to user actions. They are registered in `core/bots/` and wired through the central event bus (`core/botEngine.js`).

---

## How Bots Work

1. An event is emitted anywhere in the app (e.g. `project.created`).
2. The bot engine finds all registered bots that listen to that event.
3. Each matching bot's `handler(ctx)` function runs in a sandboxed context.
4. The bot can read `ctx.payload`, emit further events, or log messages.
5. Results and logs appear in **DevOS Dashboard → Bots** tab.

### Bot Shape

```js
export const myBot = {
  name: "My Bot",
  type: "system",          // "system" | "user" | "plugin"
  events: ["event.name"],  // list of events this bot handles
  permissions: {
    read:  ["project"],    // declared read scopes
    write: ["notification"],
  },
  async handler(ctx) {
    ctx.logger.info(`Handling ${ctx.event}`);
    return { done: true };
  },
};
```

---

## Currently Implemented Bots

| Bot | Events | What it does |
|-----|--------|-------------|
| **Deploy Bot** | `deploy.triggered` | Records a versioned deployment snapshot, emits `deployment.status.updated` |
| **Credit Bot** | `deploy.triggered`, `project.created`, `post.created` | Deducts credits for paid events, emits `credit.updated` or `credit.blocked` |
| **Feed Bot** | `post.created`, `post.liked`, `post.reposted` | Tracks cumulative feed stats (total posts, likes, reposts), emits `feed.synced` |
| **Debug Bot** | `deploy.triggered`, `project.created`, `post.created`, `comment.created`, `user.signup` | Logs a snapshot of every event payload for debugging |
| **Notification Bot** | `project.created`, `deploy.triggered`, `user.signup`, `post.created` | Confirms that in-app notification dispatch was triggered for the event |

---

## Planned Bots

### 1. Welcome Bot
- **Events:** `user.signup`
- **What it does:** Sends a personalised welcome notification + in-app message, awards 50 welcome credits, auto-follows official DevOS accounts, and optionally queues a welcome email.

### 2. Streak Bot
- **Events:** `user.active`, `project.saved`, `deploy.triggered`
- **What it does:** Updates the user's daily/monthly streak counters in Firestore. Awards streak badges (7-day, 30-day, 100-day). Emits `streak.updated` and `badge.awarded`.

### 3. Badge Bot
- **Events:** `project.created`, `deploy.triggered`, `post.created`, `follow.received`, `streak.updated`
- **What it does:** Evaluates milestone rules (e.g. "first deploy", "10 projects", "100 followers") and grants achievement badges. Emits `badge.awarded`.

### 4. Rate Limiter Bot
- **Events:** `deploy.triggered`, `project.created`, `post.created`, `comment.created`
- **What it does:** Counts events per user per rolling window (1 minute / 1 hour). Blocks the action and emits `rate.limited` if thresholds are exceeded.

### 5. Spam Detection Bot
- **Events:** `post.created`, `comment.created`
- **What it does:** Runs simple heuristics (repeated content, link spam, offensive keyword list) against the post body. Flags the post for review or auto-hides it. Emits `content.flagged`.

### 6. AI Code Review Bot
- **Events:** `project.saved`, `commit.created`
- **What it does:** Sends the diff to the DevOS AI API, receives inline suggestions, writes them as a review comment on the commit. Emits `review.created`.

### 7. Auto-Deploy Bot
- **Events:** `project.saved`
- **What it does:** Checks if the project has `autoDeploy: true` in its settings. If yes, triggers a deployment after a debounce window (30 seconds with no further saves). Emits `deploy.triggered`.

### 8. Dependency Security Bot
- **Events:** `project.created`, `project.saved`
- **What it does:** Parses `package.json` / `requirements.txt` / `Cargo.toml` in the project files. Queries a vulnerability database (e.g. OSV) for known CVEs. Creates a security advisory notification if vulnerabilities are found.

### 9. Analytics Bot
- **Events:** `*` (wildcard — all events)
- **What it does:** Aggregates event counts per hour into an `analytics` collection for the admin dashboard charts. No writes to user data — read-only aggregation.

### 10. Referral Bot
- **Events:** `user.signup`
- **What it does:** Checks `sessionStorage` for a `devos_pending_ref` code. If found, awards referral credits to both the referrer and the new user. Emits `referral.processed`.

### 11. Credit Top-up Reminder Bot
- **Events:** `credit.updated`
- **What it does:** Watches the `remaining` field in `credit.updated` payloads. If remaining credits drop below a configurable threshold (default: 10), sends a low-credit warning notification and optionally queues a reminder email.

### 12. Template Popularity Bot
- **Events:** `template.forked`, `template.viewed`
- **What it does:** Increments `forkCount` and `viewCount` on the template document. If a template reaches milestone counts (10, 50, 100 forks), sends a notification to the template author.

### 13. Community Moderator Bot
- **Events:** `post.created`, `comment.created`
- **What it does:** Checks if a post belongs to a community. If the post violates community rules (keyword filter, image-only communities, etc.), it auto-removes the post and notifies the author. Emits `content.removed`.

### 14. Org Health Bot
- **Events:** `org.member.left`, `deploy.triggered`, `project.created`
- **What it does:** Monitors org activity. Alerts the org owner if the org has been inactive for 30+ days, or if the org credit pool drops below a threshold. Emits `org.health.alert`.

### 15. Event Reminder Bot
- **Events:** `event.registered`, `event.upcoming` (scheduled, fired by a cron)
- **What it does:** Sends a reminder notification 24 hours and 1 hour before an event to all registered attendees. Emits `event.reminder.sent`.

### 16. Fork Notification Bot
- **Events:** `project.forked`
- **What it does:** Notifies the original project owner that their project was forked. Includes the forker's username and a link to the new fork.

### 17. Portfolio Sync Bot
- **Events:** `project.updated`, `project.deployed`
- **What it does:** Checks if the updated project is pinned on the owner's portfolio. If so, refreshes the portfolio snapshot (title, description, preview URL). Emits `portfolio.synced`.

### 18. Hackathon Bot
- **Events:** `project.submitted`, `hackathon.ended`
- **What it does:** Validates hackathon submissions (deadline check, required files, eligibility). After `hackathon.ended`, tallies scores and emits `hackathon.results.ready`.

### 19. AI Usage Auditor Bot
- **Events:** `ai.request`
- **What it does:** Logs every AI API call with model name, token count, cost, and user ID to an `ai_audit` collection. Enforces per-user daily AI credit limits.

### 20. Webhook Dispatch Bot
- **Events:** `deploy.triggered`, `project.created`, `post.created`
- **What it does:** Reads the project's `webhooks` settings array. For each registered webhook URL, POSTs the event payload via `fetch`. Supports retry with exponential backoff. Emits `webhook.dispatched` or `webhook.failed`.

---

## Adding a New Bot

1. Create `core/bots/yourBot.js` following the bot shape above.
2. Export it as a named export.
3. Import it in `core/bots/index.js` and add it to the `bots` array.
4. The bot will be automatically registered when `initializeDefaultBots()` runs on app boot.

### Testing

```js
import { runBotTestFlow } from "./src/lib/botEngine";
await runBotTestFlow("your-user-id");
```

Or use the **Bots** page in the DevOS dashboard to run the test flow interactively and inspect logs.

---

## Events Reference

| Event | Payload |
|-------|---------|
| `system.boot` | `{}` |
| `project.created` | `{ projectId, projectName, userId }` |
| `project.saved` | `{ projectId, userId, fileCount }` |
| `project.deleted` | `{ projectId, userId }` |
| `project.forked` | `{ originalProjectId, newProjectId, userId }` |
| `deploy.triggered` | `{ projectId, projectName, deployUrl, userId }` |
| `deployment.status.updated` | `{ projectId, status, versionId }` |
| `post.created` | `{ postId, userId }` |
| `post.liked` | `{ postId, userId, likedBy }` |
| `post.reposted` | `{ postId, userId, repostedBy }` |
| `comment.created` | `{ commentId, postId, userId }` |
| `user.signup` | `{ userId, username }` |
| `user.active` | `{ userId, date }` |
| `follow.received` | `{ followingId, followerId, followerUsername }` |
| `credit.updated` | `{ userId, used, remaining, event }` |
| `credit.blocked` | `{ userId, required, available, event }` |
| `streak.updated` | `{ userId, streak, type }` |
| `badge.awarded` | `{ userId, badge }` |
| `rate.limited` | `{ userId, event, resetAt }` |
| `content.flagged` | `{ contentId, type, reason, userId }` |
| `content.removed` | `{ contentId, type, reason, userId }` |
| `template.forked` | `{ templateId, userId }` |
| `template.viewed` | `{ templateId, userId }` |
| `org.member.left` | `{ orgId, userId }` |
| `event.registered` | `{ eventId, userId }` |
| `hackathon.ended` | `{ hackathonId }` |
| `ai.request` | `{ userId, model, tokens, cost }` |
| `webhook.dispatched` | `{ projectId, url, event }` |
| `webhook.failed` | `{ projectId, url, event, error }` |
