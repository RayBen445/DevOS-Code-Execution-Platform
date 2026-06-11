const fs = require('fs');
const path = 'src/components/IDE.tsx';
let content = fs.readFileSync(path, 'utf8');

const target1 = `<PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />`;
const replacement1 = `{isPortfolio ? (<IframePreviewPanel files={buildPreviewFiles ?? files} saveKey={previewSaveKey} />) : (<PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />)}`;

content = content.split(target1).join(replacement1);

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

fs.writeFileSync(path, content);
