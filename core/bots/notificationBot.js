/**
 * Notification Bot — fires in-app notifications for key platform events.
 * Uses Firestore directly (via Admin SDK or client SDK environment variable).
 * In the browser bundle, it calls the REST endpoint; here it just logs
 * because Firestore is not available in the pure-JS core engine context.
 */
export const notificationBot = {
  name: "Notification Bot",
  type: "system",
  events: ["project.created", "deploy.triggered", "user.signup", "post.created"],
  permissions: {
    read: ["user", "project"],
    write: ["notification"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    ctx.logger.info(`Notification triggered for ${event} — user ${payload.userId || "unknown"}`);
    // Actual Firestore writes happen in the React layer via notificationService.ts
    // This bot tracks that notifications were dispatched.
    return { notified: true, event, userId: payload.userId };
  },
};
