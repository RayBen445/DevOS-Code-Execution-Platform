const fs = require('fs');

const sourcePath = 'src/components/IDE.tsx';
const destPath = 'src/components/PortfolioIDE.tsx';

let content = fs.readFileSync(sourcePath, 'utf8');

// Rename export
content = content.replace('export default function IDE(', 'export default function PortfolioIDE(');

// Add isPortfolio constant
content = content.replace(
  'const isOrgProject = project?.ownerType === "organization" && !!project?.ownerOrgId;',
  'const isOrgProject = project?.ownerType === "organization" && !!project?.ownerOrgId;\n  const isPortfolio = true;'
);

// Pass isPortfolio to Sidebar
content = content.replace(
  /<Sidebar([\s\S]*?)readOnly=\{editorReadOnly\}([\s\S]*?)\/>/g,
  '<Sidebar$1readOnly={editorReadOnly} isPortfolio={true}$2/>'
);

// Replace desktop tabs
const desktopTabsRegex = /\{\[\n\s*\{ id: "explorer" as PanelType, icon: Files, label: "Explorer" \},\n\s*\{ id: "git" as PanelType, icon: GitBranch, label: "Source Control" \},\n\s*\{ id: "terminal" as PanelType, icon: Terminal, label: "Terminal" \},\n\s*\{ id: "preview" as PanelType, icon: Eye, label: "Preview" \},\n\s*\{ id: "deployments" as PanelType, icon: Rocket, label: "Deploy" \},\n\s*\.\.\.\(isOrgProject \? \[\{ id: "collaborators" as PanelType, icon: Users, label: "Collaborators" \}\] : \[\]\),\n\s*\{ id: "settings" as PanelType, icon: Settings, label: "Settings" \},\n\s*\]/m;
content = content.replace(
  desktopTabsRegex,
  `{[
              { id: "explorer" as PanelType, icon: Files, label: "Explorer" },
              { id: "preview" as PanelType, icon: Eye, label: "Preview" },
              { id: "deployments" as PanelType, icon: Rocket, label: "Deploy" },
              ...(isOrgProject ? [{ id: "collaborators" as PanelType, icon: Users, label: "Collaborators" }] : [])
            ]`
);

// Replace mobile nav
const mobileNavRegex = /\{ id: "git" as MobileTabId, icon: GitBranch, label: "Git" \},\n\s*\{ id: "terminal" as MobileTabId, icon: Terminal, label: "Term" \},\n\s*\{ id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" \},\n\s*\{ id: "settings" as MobileTabId, icon: Settings, label: "More" \},/m;
content = content.replace(
  mobileNavRegex,
  `{ id: "deployments" as MobileTabId, icon: Rocket, label: "Deploy" },`
);

// Replace PreviewPanel rendering (there are two places)
content = content.replace(
  /<PreviewPanel projectId=\{projectId\} files=\{buildPreviewFiles \?\? files\} entryFile=\{project\?\.entryFile\} saveKey=\{previewSaveKey\} \/>/g,
  '<IframePreviewPanel files={buildPreviewFiles ?? files} saveKey={previewSaveKey} />'
);

// Add IframePreviewPanel component
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

if (!content.includes('function IframePreviewPanel')) {
  content += iframeComponent;
}

fs.writeFileSync(destPath, content);
console.log('PortfolioIDE created successfully.');
