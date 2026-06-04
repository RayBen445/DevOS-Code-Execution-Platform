const fs = require('fs');
let content = fs.readFileSync('src/components/IDE.tsx', 'utf8');

const regex = /\{\/\* Plugins \*\/\}\s*\{mobileTab === "plugins" && \(\s*<div className="h-full overflow-y-auto">\s*<\/div>\s*\)\}/;

const replacement = `{/* Deployments */}
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
              )}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/IDE.tsx', content, 'utf8');
console.log("Fixed mobile plugin render");
