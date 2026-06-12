const fs = require('fs');

function patchSettingsPanel() {
  const path = 'src/components/SettingsPanel.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Add toast import if missing
  if (!content.includes('import { toast } from "sonner";')) {
    content = content.replace('import { doc,', 'import { toast } from "sonner";\nimport { doc,');
  }

  // Wrap getDocs in try-catch to ignore permission denied on subcollections
  content = content.replace(
    /const filesSnapshot = await getDocs\(collection\(db, "projects", projectId, "files"\)\);\n\s+filesSnapshot\.forEach\(\(fileDoc\) => {\n\s+batch\.delete\(fileDoc\.ref\);\n\s+}\);/g,
    `try {
        const filesSnapshot = await getDocs(collection(db, "projects", projectId, "files"));
        filesSnapshot.forEach((fileDoc) => {
          batch.delete(fileDoc.ref);
        });
      } catch (e) { console.warn("Could not delete files:", e); }`
  );

  content = content.replace(
    /const commitsSnapshot = await getDocs\(collection\(db, "projects", projectId, "commits"\)\);\n\s+commitsSnapshot\.forEach\(\(commitDoc\) => {\n\s+batch\.delete\(commitDoc\.ref\);\n\s+}\);/g,
    `try {
        const commitsSnapshot = await getDocs(collection(db, "projects", projectId, "commits"));
        commitsSnapshot.forEach((commitDoc) => {
          batch.delete(commitDoc.ref);
        });
      } catch (e) { console.warn("Could not delete commits:", e); }`
  );

  content = content.replace(
    /const prsSnapshot = await getDocs\(collection\(db, "projects", projectId, "pullRequests"\)\);\n\s+prsSnapshot\.forEach\(\(prDoc\) => {\n\s+batch\.delete\(prDoc\.ref\);\n\s+}\);/g,
    `try {
        const prsSnapshot = await getDocs(collection(db, "projects", projectId, "pullRequests"));
        prsSnapshot.forEach((prDoc) => {
          batch.delete(prDoc.ref);
        });
      } catch (e) { console.warn("Could not delete PRs:", e); }`
  );

  // Replace alert with toast
  content = content.replace(
    /alert\("Failed to delete project\. Please try again\."\);/g,
    `toast.error("Failed to delete project. Please try again.");`
  );

  fs.writeFileSync(path, content);
}

function patchDashboard() {
  const path = 'src/components/Dashboard.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Wrap getDocs in try-catch to ignore permission denied on subcollections
  content = content.replace(
    /const filesSnapshot = await getDocs\(collection\(db, "projects", projectId, "files"\)\);\n\s+filesSnapshot\.forEach\(\(fileDoc\) => {\n\s+batch\.delete\(fileDoc\.ref\);\n\s+}\);/g,
    `try {
        const filesSnapshot = await getDocs(collection(db, "projects", projectId, "files"));
        filesSnapshot.forEach((fileDoc) => {
          batch.delete(fileDoc.ref);
        });
      } catch (e) { console.warn("Could not delete files:", e); }`
  );

  content = content.replace(
    /const commitsSnapshot = await getDocs\(collection\(db, "projects", projectId, "commits"\)\);\n\s+commitsSnapshot\.forEach\(\(commitDoc\) => {\n\s+batch\.delete\(commitDoc\.ref\);\n\s+}\);/g,
    `try {
        const commitsSnapshot = await getDocs(collection(db, "projects", projectId, "commits"));
        commitsSnapshot.forEach((commitDoc) => {
          batch.delete(commitDoc.ref);
        });
      } catch (e) { console.warn("Could not delete commits:", e); }`
  );

  content = content.replace(
    /const prsSnapshot = await getDocs\(collection\(db, "projects", projectId, "pullRequests"\)\);\n\s+prsSnapshot\.forEach\(\(prDoc\) => {\n\s+batch\.delete\(prDoc\.ref\);\n\s+}\);/g,
    `try {
        const prsSnapshot = await getDocs(collection(db, "projects", projectId, "pullRequests"));
        prsSnapshot.forEach((prDoc) => {
          batch.delete(prDoc.ref);
        });
      } catch (e) { console.warn("Could not delete PRs:", e); }`
  );

  fs.writeFileSync(path, content);
}

function patchPortfolioIDE() {
  const path = 'src/components/PortfolioIDE.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Remove unwanted tabs from mobileTabs
  content = content.replace(
    /\{ id: "git" as MobileTabId, icon: GitBranch, label: "Git" \},\n\s+\{ id: "terminal" as MobileTabId, icon: Terminal, label: "Terminal" \},\n\s+\{ id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" \},\n\s+\{ id: "settings" as MobileTabId, icon: Settings, label: "More" \},/g,
    ''
  );

  // Remove from PanelType
  content = content.replace(
    /type PanelType = "explorer" \| "git" \| "terminal" \| "preview" \| "deployments" \| "settings" \| "collaborators" \| null;/g,
    'type PanelType = "explorer" | "preview" | null;'
  );

  // Remove from mobileTab state
  content = content.replace(
    /type MobileTabId = "editor" \| "files" \| "preview" \| "git" \| "terminal" \| "deployments" \| "settings" \| "collaborators";/g,
    'type MobileTabId = "editor" | "files" | "preview";'
  );

  // Remove sidebar buttons
  content = content.replace(
    /\{\s*id: "git" as PanelType,\s*icon: GitBranch,\s*label: "Source Control"\s*\},\n\s*\{\s*id: "terminal" as PanelType,\s*icon: Terminal,\s*label: "Terminal"\s*\},\n\s*\{\s*id: "deployments" as PanelType,\s*icon: Rocket,\s*label: "Deploy"\s*\},\n\s*\{\s*id: "settings" as PanelType,\s*icon: Settings,\s*label: "Settings"\s*\}/g,
    ''
  );

  // Remove setting panel render
  content = content.replace(
    /\{\/\* Settings \*\/\}\n\s*\{mobileTab === "settings" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<SettingsPanel projectId=\{projectId\} project=\{project\} files=\{files\} onDelete=\{onBack\} \/>\n\s*<\/div>\n\s*\)\}/g,
    ''
  );

  content = content.replace(
    /\{\/\* Settings Panel - hidden on mobile, hidden in focus mode \*\/\}\n\s*\{activePanel === "settings" && !isFocusMode && \(\n\s*<div className="flex-shrink-0">\n\s*<SettingsPanel \n\s*projectId=\{projectId\} \n\s*project=\{project\} \n\s*files=\{files\} \n\s*onDelete=\{onBack\}\n\s*\/>\n\s*<\/div>\n\s*\)\}/g,
    ''
  );

  fs.writeFileSync(path, content);
}

try {
  patchSettingsPanel();
  console.log("Patched SettingsPanel.tsx");
  patchDashboard();
  console.log("Patched Dashboard.tsx");
  patchPortfolioIDE();
  console.log("Patched PortfolioIDE.tsx");
} catch (e) {
  console.error("Error patching:", e);
}
