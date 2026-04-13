/**
 * Welcome Bot — runs when a new user signs up.
 *
 * Responsibilities:
 *  1. Log the signup event for audit/analytics
 *  2. Emit a `notification.welcome` event (consumed by the React layer → notificationService.ts)
 *  3. Emit a `feed.welcome_post` event so the user appears on the public feed
 *  4. Emit `credit.grant.signup` so the credits bot can award sign-up credits
 */
const welcomeMessages = [
  "Welcome to DevOS! Start by creating your first project 🚀",
  "You're in! DevOS lets you build, deploy, and share projects in seconds.",
  "Hey there, developer! Your DevOS workspace is ready — go build something amazing.",
  "Welcome aboard! Check out the Plugin Marketplace to supercharge your next project.",
];

function pickMessage(userId) {
  const idx = Math.abs(userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % welcomeMessages.length;
  return welcomeMessages[idx];
}

export const welcomeBot = {
  name: "Welcome Bot",
  type: "system",
  events: ["user.signup"],
  permissions: {
    read: ["user"],
    write: ["notification", "feed", "credit"],
  },
  async handler(ctx) {
    const { userId, username, email } = ctx.payload;
    if (!userId) throw new Error("user.signup event missing userId");

    ctx.logger.info(`New user signed up: ${username || email || userId}`);

    const msg = pickMessage(userId);

    // 1. Welcome notification (React layer picks this up via notificationService.ts)
    await ctx.emit("notification.welcome", {
      userId,
      title: "Welcome to DevOS 🎉",
      message: msg,
      type: "system",
    });

    // 2. Award signup credits (Credit Bot listens on credit.grant)
    await ctx.emit("credit.grant", {
      userId,
      amount: 50,
      reason: "signup_bonus",
    });

    // 3. Trigger onboarding checklist creation
    await ctx.emit("onboarding.start", {
      userId,
      steps: ["create_project", "run_project", "deploy_project", "follow_user"],
    });

    return {
      welcomed: true,
      userId,
      message: msg,
    };
  },
};
