import fs from 'fs';
import path from 'path';

const replaceInFile = (filePath, replacer) => {
  const fullPath = path.resolve('c:/Users/DELL/Documents/GitHub/DevOS-Code-Execution-Platform', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  const newContent = replacer(content);
  if (newContent !== content) {
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
};

// 1. IDE.tsx
replaceInFile('src/components/IDE.tsx', (content) => {
  let c = content;
  // Remove PluginPanel import
  c = c.replace(/import PluginPanel from ".\/PluginPanel";\n?/, '');
  // Remove plugins tab button
  c = c.replace(/<button\s+onClick=\{\(\) => setActiveRightTab\("plugins"\)\}[^>]+>[\s\S]*?<Puzzle[^>]*>[\s\S]*?<\/button>\n?/, '');
  c = c.replace(/<button\s+onClick=\{\(\) => setActiveRightTab\("plugins"\)\}[^>]+>[\s\S]*?Puzzle[\s\S]*?<\/button>\n?/, '');
  // Remove PluginPanel usage
  c = c.replace(/<PluginPanel[^>]*\/>/g, '');
  return c;
});

// 2. Dashboard.tsx
replaceInFile('src/components/Dashboard.tsx', (content) => {
  let c = content;
  // Change "Marketplace" to "Templates"
  c = c.replace(/>\s*Marketplace\s*<\/button>/, '>\n            Templates\n          </button>');
  return c;
});

// 3. Navbar.tsx
replaceInFile('src/components/Navbar.tsx', (content) => {
  let c = content;
  // Remove "Marketplace · Coming Soon" button (desktop)
  c = c.replace(/<button[^>]*>\s*<Layout[^>]*\/>\s*Marketplace · Coming Soon\s*<\/button>/, '');
  // Remove "Marketplace · Coming Soon" link (mobile)
  c = c.replace(/<span[^>]*>\s*Marketplace · Coming Soon\s*<\/span>/, '');
  return c;
});

// 4. Home.tsx
replaceInFile('src/components/Home.tsx', (content) => {
  let c = content;
  // Remove Marketplace feature object
  c = c.replace(/\{\s*icon: Puzzle,\s*title: "Marketplace[^}]+\},/, '');
  // Remove Plugin Marketplace teaser
  c = c.replace(/\{\/\* ── Plugin Marketplace teaser ─────────────────────────────── \*\/\}\s*<section[\s\S]*?<\/section>/, '');
  return c;
});

// 5. DocsPage.tsx
replaceInFile('src/pages/DocsPage.tsx', (content) => {
  let c = content;
  // DocsPage was already stripped, but let's make sure
  return c;
});

// 6. SearchPage.tsx
replaceInFile('src/pages/SearchPage.tsx', (content) => {
  let c = content;
  c = c.replace(/\{\s*title:\s*"Template Marketplace Docs"[^\}]+\},\n?/, '');
  return c;
});

// 7. templates.ts
replaceInFile('src/constants/templates.ts', (content) => {
  let c = content;
  c = c.replace(/Install DevOS AI from the Plugin Marketplace and add your key/g, 'Add your OpenAI key in Settings');
  c = c.replace(/2\. Open the \*\*Plugin Marketplace\*\* \(sidebar → 🧩 Plugins\)\.\n/g, '');
  return c;
});

// 8. TermsPage.tsx
replaceInFile('src/pages/TermsPage.tsx', (content) => {
  let c = content;
  c = c.replace(/, and a Plugin Marketplace \(coming soon\)/g, '');
  return c;
});
