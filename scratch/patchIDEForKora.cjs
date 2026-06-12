const fs = require('fs');

const path = 'src/components/IDE.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add KoraChatWidget import
if (!content.includes('import KoraChatWidget')) {
  content = content.replace(
    'import { Toaster } from "sonner";',
    'import { Toaster } from "sonner";\nimport KoraChatWidget from "./KoraChatWidget";'
  );
}

// Add 'kora' to PanelType
if (!content.includes('"kora"')) {
  content = content.replace(
    'type PanelType = "explorer" | "git" | "terminal" | "preview" | "deployments" | "collaborators" | "settings";',
    'type PanelType = "explorer" | "git" | "terminal" | "preview" | "deployments" | "collaborators" | "settings" | "kora";'
  );
  content = content.replace(
    'type MobileTabId = "explorer" | "git" | "terminal" | "deployments" | "settings" | "preview";',
    'type MobileTabId = "explorer" | "git" | "terminal" | "deployments" | "settings" | "preview" | "kora";'
  );
}

// Add KORA tab to desktop sidebar
if (!content.includes('id: "kora" as PanelType')) {
  content = content.replace(
    '{ id: "terminal" as PanelType, icon: Terminal, label: "Terminal" },',
    '{ id: "terminal" as PanelType, icon: Terminal, label: "Terminal" },\n              { id: "kora" as PanelType, icon: Bot, label: "KORA AI" },'
  );
}

// Add KORA tab to mobile nav
if (!content.includes('id: "kora" as MobileTabId')) {
  content = content.replace(
    '{ id: "terminal" as MobileTabId, icon: Terminal, label: "Term" },',
    '{ id: "terminal" as MobileTabId, icon: Terminal, label: "Term" },\n        { id: "kora" as MobileTabId, icon: Bot, label: "KORA" },'
  );
}

// Add Bot import if missing
if (!content.includes('Bot,')) {
  content = content.replace(
    'import { Play, Terminal, FolderPlus, FilePlus, Settings, Save, Trash2, X, AlertCircle, Loader2, Menu, Share2, GitBranch, Download, Check, Eye, Users, Search, ChevronRight, ChevronDown, Monitor, Moon, Sun, Smartphone, Rocket } from "lucide-react";',
    'import { Play, Terminal, FolderPlus, FilePlus, Settings, Save, Trash2, X, AlertCircle, Loader2, Menu, Share2, GitBranch, Download, Check, Eye, Users, Search, ChevronRight, ChevronDown, Monitor, Moon, Sun, Smartphone, Rocket, Bot } from "lucide-react";'
  );
}

// Render KORA in active panel
if (!content.includes('<KoraChatWidget />')) {
  content = content.replace(
    '{activePanel === "git" && <GitPanel projectId={projectId} onFileSelect={handleFileSelect} currentFiles={files} />}',
    '{activePanel === "git" && <GitPanel projectId={projectId} onFileSelect={handleFileSelect} currentFiles={files} />}\n            {activePanel === "kora" && <KoraChatWidget />}'
  );
  
  // Mobile content rendering
  content = content.replace(
    '{activeMobileTab === "git" && <GitPanel projectId={projectId} onFileSelect={handleFileSelect} currentFiles={files} />}',
    '{activeMobileTab === "git" && <GitPanel projectId={projectId} onFileSelect={handleFileSelect} currentFiles={files} />}\n          {activeMobileTab === "kora" && <KoraChatWidget />}'
  );
}

fs.writeFileSync(path, content);
console.log('IDE.tsx patched with Kora.');
