const fs = require('fs');

const idePath = 'src/components/IDE.tsx';
let ideCode = fs.readFileSync(idePath, 'utf8');

const sidebarPath = 'src/components/Sidebar.tsx';
let sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

// 1. Sidebar.tsx
sidebarCode = sidebarCode.replace(
  'interface SidebarProps {\n  files: FileData[];\n  activeFileId: string | null;\n  onSelectFile: (id: string) => void;\n  projectId: string;\n  readOnly?: boolean;\n}',
  'interface SidebarProps {\n  files: FileData[];\n  activeFileId: string | null;\n  onSelectFile: (id: string) => void;\n  projectId: string;\n  readOnly?: boolean;\n  isPortfolio?: boolean;\n}'
);

sidebarCode = sidebarCode.replace(
  /export default function Sidebar\(\{ files, activeFileId, onSelectFile, projectId, readOnly \}: SidebarProps\) \{/g,
  'export default function Sidebar({ files, activeFileId, onSelectFile, projectId, readOnly, isPortfolio }: SidebarProps) {'
);

const handleCreateFileRegex = /const extension = newFileName\.split\("\."\)\.pop\(\) \|\| "txt";/;
sidebarCode = sidebarCode.replace(
  handleCreateFileRegex,
  `const extension = newFileName.split(".").pop() || "txt";\n    if (isPortfolio && !['html', 'css', 'js', 'json'].includes(extension.toLowerCase())) {\n      toast.error("Portfolio projects only support HTML, CSS, JS, and JSON files.");\n      return;\n    }`
);

const handleFileUploadRegex = /if \(!file\) return;/;
sidebarCode = sidebarCode.replace(
  handleFileUploadRegex,
  `if (!file) return;\n    const ext = file.name.split('.').pop()?.toLowerCase() || '';\n    if (isPortfolio && !['html', 'css', 'js', 'json'].includes(ext)) {\n      toast.error("Portfolio projects only support HTML, CSS, JS, and JSON files.");\n      return;\n    }`
);

fs.writeFileSync(sidebarPath, sidebarCode);

// 2. IDE.tsx
ideCode = ideCode.replace(
  'const isOrgProject = project?.ownerType === "organization" && !!project?.ownerOrgId;',
  'const isOrgProject = project?.ownerType === "organization" && !!project?.ownerOrgId;\n  const isPortfolio = project?.systemType === "portfolio";'
);

ideCode = ideCode.replace(
  '<Sidebar files={files} activeFileId={activeFileId} onSelectFile={openFileInTab} projectId={projectId} readOnly={editorReadOnly} />',
  '<Sidebar files={files} activeFileId={activeFileId} onSelectFile={openFileInTab} projectId={projectId} readOnly={editorReadOnly} isPortfolio={isPortfolio} />'
);

const desktopTabsRegex = /\{\[\n\s*\{ id: "explorer", icon: Files, label: "Explorer" \},\n\s*\{ id: "git", icon: GitBranch, label: "Version Control" \},\n\s*\{ id: "terminal", icon: Terminal, label: "Terminal" \},\n\s*\{ id: "deployments", icon: Rocket, label: "Deployments" \},\n\s*\{ id: "settings", icon: Settings, label: "Settings" \}/;
ideCode = ideCode.replace(
  desktopTabsRegex,
  `{[
              { id: "explorer", icon: Files, label: "Explorer" },
              ...(isPortfolio ? [] : [{ id: "git", icon: GitBranch, label: "Version Control" }]),
              ...(isPortfolio ? [] : [{ id: "terminal", icon: Terminal, label: "Terminal" }]),
              { id: "deployments", icon: Rocket, label: "Deployments" },
              ...(isPortfolio ? [] : [{ id: "settings", icon: Settings, label: "Settings" }])`
);

const mobileNavRegex = /\{ id: "git" as MobileTabId, icon: GitBranch, label: "Git" \},\n\s*\{ id: "terminal" as MobileTabId, icon: Terminal, label: "Term" \},\n\s*\{ id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" \},\n\s*\{ id: "settings" as MobileTabId, icon: Settings, label: "More" \},/;
ideCode = ideCode.replace(
  mobileNavRegex,
  `...(isPortfolio ? [] : [{ id: "git" as MobileTabId, icon: GitBranch, label: "Git" }]),
    ...(isPortfolio ? [] : [{ id: "terminal" as MobileTabId, icon: Terminal, label: "Term" }]),
    { id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" },
    ...(isPortfolio ? [] : [{ id: "settings" as MobileTabId, icon: Settings, label: "More" }]),`
);

const previewPanelRegex1 = /<PreviewPanel projectId=\{projectId\} files=\{buildPreviewFiles \?\? files\} entryFile=\{project\?\.entryFile\} saveKey=\{previewSaveKey\} \/>/;
ideCode = ideCode.replace(
  previewPanelRegex1,
  `{isPortfolio ? (
                      <IframePreviewPanel files={buildPreviewFiles ?? files} saveKey={previewSaveKey} />
                    ) : (
                      <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
                    )}`
);

const previewPanelRegex2 = /<PreviewPanel projectId=\{projectId\} files=\{buildPreviewFiles \?\? files\} entryFile=\{project\?\.entryFile\} saveKey=\{previewSaveKey\} \/>/;
ideCode = ideCode.replace(
  previewPanelRegex2,
  `{isPortfolio ? (
                  <IframePreviewPanel files={buildPreviewFiles ?? files} saveKey={previewSaveKey} />
                ) : (
                  <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
                )}`
);

const iframeComponent = `
function IframePreviewPanel({ files, saveKey }: { files: FileData[]; saveKey: number }) {
  const [srcDoc, setSrcDoc] = useState("");
  const [key, setKey] = useState(0);

  useEffect(() => {
    let htmlContent = files.find(f => f.name.toLowerCase() === "index.html")?.content || "";
    const cssContent = files.find(f => f.name.toLowerCase() === "style.css")?.content || "";
    const jsContent = files.find(f => f.name.toLowerCase() === "script.js")?.content || "";

    if (!htmlContent) {
      setSrcDoc(\`<div style="color:white; font-family:sans-serif; padding:20px;">No index.html found. Please create one to view preview.</div>\`);
      return;
    }

    if (cssContent && !htmlContent.includes('style.css')) {
       htmlContent = htmlContent.replace('</head>', \`<style>\${cssContent}</style></head>\`);
    } else if (cssContent && htmlContent.includes('style.css')) {
       htmlContent = htmlContent.replace(/<link[^>]*href="style.css"[^>]*>/i, \`<style>\${cssContent}</style>\`);
    }

    if (jsContent && !htmlContent.includes('script.js')) {
       htmlContent = htmlContent.replace('</body>', \`<script>\${jsContent}</script></body>\`);
    } else if (jsContent && htmlContent.includes('script.js')) {
       htmlContent = htmlContent.replace(/<script[^>]*src="script.js"[^>]*><\\/script>/i, \`<script>\${jsContent}</script>\`);
    }

    setSrcDoc(htmlContent);
    setKey(k => k + 1);
  }, [files, saveKey]);

  return (
    <div className="w-full h-full bg-white relative">
      <iframe
        key={key}
        srcDoc={srcDoc}
        title="Portfolio Preview"
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full border-0"
      />
    </div>
  );
}
`;

if (!ideCode.includes('function IframePreviewPanel')) {
  ideCode += iframeComponent;
}

fs.writeFileSync(idePath, ideCode);

console.log("Updated IDE.tsx and Sidebar.tsx");
