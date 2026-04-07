export const debugBot = {
  name: "Debug Bot",
  type: "system",
  events: ["deploy.triggered", "project.created", "post.created", "comment.created", "user.signup"],
  permissions: {
    read: ["project", "feed", "user"],
    write: ["log"],
  },
  async handler(ctx) {
    ctx.logger.info(`Debug snapshot for ${ctx.event}`);
    return {
      event: ctx.event,
      payloadKeys: Object.keys(ctx.payload || {}),
      timestamp: new Date().toISOString(),
    };
  },
};
