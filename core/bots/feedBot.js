const feedStats = {
  created: 0,
  liked: 0,
  reposted: 0,
};

export const feedBot = {
  name: "Feed Bot",
  type: "system",
  events: ["post.created", "post.liked", "post.reposted"],
  permissions: {
    read: ["feed"],
    write: ["feed"],
  },
  async handler(ctx) {
    if (ctx.event === "post.created") feedStats.created += 1;
    if (ctx.event === "post.liked") feedStats.liked += 1;
    if (ctx.event === "post.reposted") feedStats.reposted += 1;

    await ctx.emit("feed.synced", { ...feedStats, triggeredBy: ctx.event });
    return { ...feedStats };
  },
};

export function getFeedStats() {
  return { ...feedStats };
}
