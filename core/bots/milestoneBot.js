/**
 * Milestone Bot — awards badges and emits notifications when users hit key milestones.
 *
 * Milestone checks run after:
 *   project.created   → check project count milestones
 *   deploy.success    → check deploy count milestones
 *   post.created      → check post count milestones
 *   user.follower_added → check follower count milestones
 *   project.viewed    → check total view milestones
 *   commit.created    → check commit streak milestones
 *
 * Each milestone fires a `milestone.achieved` event that the React layer uses
 * to write a badge to Firestore and show an in-app toast/notification.
 */

// ── Milestone definitions ────────────────────────────────────────────────────

const MILESTONES = {
  project_count: [
    { count: 1,   badge: "first_project",      title: "First Project! 🚀",        message: "You created your first DevOS project!" },
    { count: 5,   badge: "five_projects",       title: "Project Streak 🔥",         message: "5 projects and counting!" },
    { count: 10,  badge: "ten_projects",        title: "Productive Dev 💻",         message: "10 projects created — you're on a roll!" },
    { count: 25,  badge: "prolific_builder",    title: "Prolific Builder ⚒️",       message: "25 projects! You're seriously productive." },
    { count: 50,  badge: "project_master",      title: "Project Master 🏆",         message: "50 projects! You're a DevOS power user." },
  ],
  deploy_count: [
    { count: 1,   badge: "first_deploy",        title: "First Deploy! 🌍",          message: "Your project is live on the internet!" },
    { count: 10,  badge: "ten_deploys",         title: "Deploying Machines ⚡",     message: "10 deployments — your apps are everywhere." },
    { count: 50,  badge: "deploy_veteran",      title: "Deploy Veteran 🎖️",        message: "50 deploys — seriously impressive." },
  ],
  post_count: [
    { count: 1,   badge: "first_post",          title: "First Post! 📝",            message: "You posted to the DevOS feed for the first time!" },
    { count: 10,  badge: "active_poster",       title: "Active Poster ✍️",          message: "10 posts — keep sharing your work!" },
    { count: 50,  badge: "community_voice",     title: "Community Voice 📣",        message: "50 posts — you're a real community contributor." },
  ],
  follower_count: [
    { count: 1,   badge: "first_follower",      title: "First Follower! 👥",        message: "Someone is following your work!" },
    { count: 10,  badge: "rising_star",         title: "Rising Star ⭐",            message: "10 followers — people notice your work." },
    { count: 100, badge: "influencer",          title: "Influencer 🌟",             message: "100 followers — you're an inspiration!" },
    { count: 500, badge: "devos_celebrity",     title: "DevOS Celebrity 🏅",        message: "500 followers. Absolute legend." },
  ],
  view_count: [
    { count: 100,   badge: "hundred_views",     title: "100 Views! 👀",             message: "Your projects have been viewed 100 times!" },
    { count: 1000,  badge: "thousand_views",    title: "1K Views! 🎉",              message: "1,000 project views — you're getting noticed!" },
    { count: 10000, badge: "ten_k_views",       title: "10K Views! 🏆",             message: "10,000 views! Your work is seriously popular." },
  ],
  commit_count: [
    { count: 1,   badge: "first_commit",        title: "First Commit! 💾",          message: "You made your first commit on DevOS." },
    { count: 10,  badge: "ten_commits",         title: "Version Control Pro 🔀",    message: "10 commits — great development hygiene!" },
    { count: 100, badge: "commit_century",      title: "Commit Century 💯",         message: "100 commits — dedicated developer!" },
  ],
};

// In-memory counters (React layer is source of truth; this is used for fast checks)
const userCounters = new Map(); // userId → { project_count, deploy_count, ... }
const awardedBadges = new Map(); // userId → Set<badge>

function getCounters(userId) {
  if (!userCounters.has(userId)) {
    userCounters.set(userId, {
      project_count: 0,
      deploy_count: 0,
      post_count: 0,
      follower_count: 0,
      view_count: 0,
      commit_count: 0,
    });
  }
  return userCounters.get(userId);
}

function getAwardedBadges(userId) {
  if (!awardedBadges.has(userId)) awardedBadges.set(userId, new Set());
  return awardedBadges.get(userId);
}

async function checkMilestone(ctx, userId, counterKey, newCount) {
  const milestones = MILESTONES[counterKey] || [];
  const awarded = getAwardedBadges(userId);
  const newlyAwarded = [];

  for (const m of milestones) {
    if (newCount >= m.count && !awarded.has(m.badge)) {
      awarded.add(m.badge);
      newlyAwarded.push(m);
      ctx.logger.info(`[Milestone Bot] ${userId} achieved: ${m.badge}`);
      await ctx.emit("milestone.achieved", {
        userId,
        badge: m.badge,
        title: m.title,
        message: m.message,
        counterKey,
        count: newCount,
      });
    }
  }

  return newlyAwarded;
}

const EVENT_TO_COUNTER = {
  "project.created":      "project_count",
  "deploy.success":       "deploy_count",
  "post.created":         "post_count",
  "user.follower_added":  "follower_count",
  "project.viewed":       "view_count",
  "commit.created":       "commit_count",
};

export const milestoneBot = {
  name: "Milestone Bot",
  type: "system",
  events: Object.keys(EVENT_TO_COUNTER),
  permissions: {
    read: ["user", "project", "feed"],
    write: ["badge", "notification"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    const userId = payload.userId;
    if (!userId) return { skipped: true, reason: "no_userId" };

    const counterKey = EVENT_TO_COUNTER[event];
    if (!counterKey) return { skipped: true, reason: "unknown_event" };

    const counters = getCounters(userId);

    // For view_count, the payload may carry a delta or absolute value
    if (event === "project.viewed") {
      counters[counterKey] = (payload.totalViews || counters[counterKey] + 1);
    } else {
      counters[counterKey] += 1;
    }

    const newCount = counters[counterKey];
    const milestones = await checkMilestone(ctx, userId, counterKey, newCount);

    return {
      userId,
      counterKey,
      newCount,
      milestones: milestones.map(m => m.badge),
    };
  },
};

export function getUserCounters(userId) {
  return { ...getCounters(userId) };
}

export function getUserBadges(userId) {
  return Array.from(getAwardedBadges(userId));
}
