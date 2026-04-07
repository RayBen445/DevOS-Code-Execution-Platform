const deploymentVersions = [];

export const deployBot = {
  name: "Deploy Bot",
  type: "system",
  events: ["deploy.triggered"],
  permissions: {
    read: ["project"],
    write: ["deployment", "version"],
  },
  async handler(ctx) {
    if (!ctx.can("project") && !ctx.can("deployment")) {
      throw new Error("Missing deploy permissions");
    }

    const version = {
      versionId: `v-${Date.now()}`,
      projectId: ctx.payload.projectId,
      deployUrl: ctx.payload.deployUrl || null,
      createdAt: new Date().toISOString(),
      status: "deployed",
    };

    deploymentVersions.unshift(version);
    await ctx.emit("deployment.status.updated", {
      projectId: ctx.payload.projectId,
      status: "success",
      versionId: version.versionId,
    });

    return version;
  },
};

export function getDeploymentVersions() {
  return deploymentVersions;
}
