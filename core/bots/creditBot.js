const userCredits = new Map();

const COST_BY_EVENT = {
  "deploy.triggered": 5,
  "project.created": 2,
  "post.created": 1,
};

const TRACKED_EVENTS = Object.keys(COST_BY_EVENT);

function ensureCredits(userId) {
  if (!userCredits.has(userId)) userCredits.set(userId, 100);
  return userCredits.get(userId);
}

export const creditBot = {
  name: "Credit Bot",
  type: "system",
  events: TRACKED_EVENTS,
  permissions: {
    read: ["credit"],
    write: ["credit"],
  },
  async handler(ctx) {
    const userId = ctx.payload.userId || "anonymous";
    const cost = COST_BY_EVENT[ctx.event] || 0;
    const currentCredits = ensureCredits(userId);

    if (currentCredits < cost) {
      await ctx.emit("credit.blocked", {
        userId,
        required: cost,
        available: currentCredits,
        event: ctx.event,
      });
      throw new Error(`Insufficient credits for ${ctx.event}`);
    }

    const updatedCredits = currentCredits - cost;
    userCredits.set(userId, updatedCredits);

    await ctx.emit("credit.updated", {
      userId,
      used: cost,
      remaining: updatedCredits,
      event: ctx.event,
    });

    return { userId, remaining: updatedCredits };
  },
};

export function getUserCredits(userId) {
  return ensureCredits(userId);
}
