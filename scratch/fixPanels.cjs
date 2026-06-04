const fs = require('fs');

let content = fs.readFileSync('src/components/IDE.tsx', 'utf8');

content = content.replace(
  `type PanelType = "explorer" | "git" | "terminal" | "preview" | "plugins" | "settings" | "collaborators" | null;`,
  `type PanelType = "explorer" | "git" | "terminal" | "preview" | "deployments" | "settings" | "collaborators" | null;`
);

content = content.replace(
  `type MobileTabId = "editor" | "files" | "preview" | "git" | "terminal" | "plugins" | "settings" | "collaborators";`,
  `type MobileTabId = "editor" | "files" | "preview" | "git" | "terminal" | "deployments" | "settings" | "collaborators";`
);

content = content.replace(
  `{ id: "plugins" as MobileTabId, icon: Puzzle, label: "Plugins" },`,
  `{ id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" },`
);

content = content.replace(
  `{ id: "plugins" as PanelType, icon: Puzzle, label: "Plugins" },`,
  `{ id: "deployments" as PanelType, icon: Rocket, label: "Deploy" },`
);

content = content.replace(
  `{/* Plugins */}
              {mobileTab === "plugins" && (
                <div className="h-full overflow-y-auto">
                  
                </div>
              )}`,
  `{/* Deployments */}
              {mobileTab === "deployments" && canDeploy && (
                <div className="h-full overflow-y-auto p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Deployments</h3>
                    <DeploymentDashboard
                      projectId={projectId}
                      userId={user?.uid ?? ""}
                      activeDeploymentId={project?.activeDeploymentId}
                      canManage={canDeploy}
                    />
                </div>
              )}`
);

content = content.replace(
  `{/* Deployments Panel — shows history, rollback, branch deployments */}
              {project?.systemType !== 'portfolio' && activePanel === "settings" && !isFocusMode && canDeploy && (
                <div className="hidden md:flex w-80 border-r border-border-base flex-col overflow-y-auto">
                  <div className="p-4 border-b border-border-base">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Deployments</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <DeploymentDashboard
                      projectId={projectId}
                      userId={user?.uid ?? ""}
                      activeDeploymentId={project?.activeDeploymentId}
                      canManage={canDeploy}
                    />
                  </div>
                </div>
              )}`,
  `{/* Deployments Panel — shows history, rollback, branch deployments */}
              {project?.systemType !== 'portfolio' && activePanel === "deployments" && !isFocusMode && canDeploy && (
                <div className="hidden md:flex w-80 border-r border-border-base flex-col overflow-y-auto">
                  <div className="p-4 border-b border-border-base">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Deployments</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3">
                    <DeploymentDashboard
                      projectId={projectId}
                      userId={user?.uid ?? ""}
                      activeDeploymentId={project?.activeDeploymentId}
                      canManage={canDeploy}
                    />
                  </div>
                </div>
              )}`
);

content = content.replace(
  `{/* Plugin Marketplace Panel */}
              {project?.systemType !== 'portfolio' && activePanel === "plugins" && !isFocusMode && (
                <div className="hidden md:flex w-80 border-r border-border-base flex-col overflow-hidden bg-surface p-6">
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <Puzzle className="w-12 h-12 text-blue-500/50" />
                    <h3 className="text-lg font-bold text-white">Plugin Marketplace</h3>
                    <p className="text-sm text-white/50 leading-relaxed">Discover and install plugins to extend your IDE experience.<br/><br/>Coming soon!</p>
                  </div>
                </div>
              )}`,
  ``
);

fs.writeFileSync('src/components/IDE.tsx', content, 'utf8');
console.log("Updated IDE.tsx");
