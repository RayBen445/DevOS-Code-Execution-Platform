/**
 * Plugin Bot — fires when plugins are installed/uninstalled on a project.
 *
 * Fires on:
 *   plugin.installed    → log activity, notify owner, emit credit check
 *   plugin.uninstalled  → log activity, emit cleanup signal
 *   plugin.key_rotated  → notify owner about the new key
 */

export const pluginBot = {
  name: "Plugin Bot",
  type: "system",
  events: ["plugin.installed", "plugin.uninstalled", "plugin.key_rotated"],
  permissions: {
    read: ["project"],
    write: ["activity", "notification", "credit"],
  },
  async handler(ctx) {
    const { event, payload } = ctx;
    const { userId, projectId, pluginId, pluginName } = payload;

    ctx.logger.info(`[Plugin Bot] ${event} — ${pluginName || pluginId} on project ${projectId}`);

    if (event === "plugin.installed") {
      // Notify project owner
      await ctx.emit("notification.plugin_installed", {
        userId,
        title: `${pluginName || pluginId} installed`,
        message: `The ${pluginName || pluginId} plugin is now active on your project. Env vars have been added.`,
        type: "plugin",
        projectId,
      });

      // Deduct install credit (nominal cost)
      await ctx.emit("credit.use", {
        userId,
        amount: 1,
        reason: `plugin_install:${pluginId}`,
        projectId,
      });

      // Emit activity event (picked up by activityBot)
      await ctx.emit("activity.logged", {
        projectId,
        entry: {
          type: "plugin_installed",
          message: `Installed plugin: ${pluginName || pluginId}`,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (event === "plugin.uninstalled") {
      await ctx.emit("notification.plugin_uninstalled", {
        userId,
        title: `${pluginName || pluginId} uninstalled`,
        message: `The ${pluginName || pluginId} plugin and its env vars have been removed from your project.`,
        type: "plugin",
        projectId,
      });

      await ctx.emit("activity.logged", {
        projectId,
        entry: {
          type: "plugin_uninstalled",
          message: `Uninstalled plugin: ${pluginName || pluginId}`,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (event === "plugin.key_rotated") {
      await ctx.emit("notification.plugin_key_rotated", {
        userId,
        title: `${pluginName || pluginId} key rotated`,
        message: `Your ${pluginName || pluginId} project key was rotated. Update your env vars.`,
        type: "security",
        projectId,
      });
    }

    return { handled: true, event, pluginId, projectId };
  },
};
