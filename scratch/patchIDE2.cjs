const fs = require('fs');

const path = 'src/components/PortfolioIDE.tsx';
let content = fs.readFileSync(path, 'utf8');

// 176: remove terminal checks
content = content.replace(/\|\| \(activePanel === "terminal" \|\| mobileTab === "terminal"\) \? "100%" : /g, '');

// 929: remove setActivePanel("terminal")
content = content.replace(/if \(!showTerminal\) \{\n\s*setShowTerminal\(true\);\n\s*setActivePanel\("terminal"\);\n\s*\}/g, 'if (!showTerminal) { setShowTerminal(true); }');

// 1016: remove setActivePanel("terminal")
content = content.replace(/setActivePanel\("terminal"\);/g, '');

// 1758, 1765, 1774, 1781, 1794: remove mobile tab renders
content = content.replace(/\{\/\* Source Control \*\/\}\n\s*\{mobileTab === "git" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<GitPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Terminal \*\/\}\n\s*\{mobileTab === "terminal" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<TerminalPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Settings \*\/\}\n\s*\{mobileTab === "settings" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<SettingsPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Deployments \*\/\}\n\s*\{mobileTab === "deployments" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<DeploymentsPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Collaborators \*\/\}\n\s*\{mobileTab === "collaborators" && \(\n\s*<div className="absolute inset-0 z-10 bg-background overflow-hidden">\n\s*<CollaboratorsPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

// 1827, 1834, 1846, 1853: remove active panel renders
content = content.replace(/\{\/\* Source Control Panel - hidden on mobile, hidden in focus mode \*\/\}\n\s*\{activePanel === "git" && !isFocusMode && \(\n\s*<div className="flex-shrink-0">\n\s*<GitPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Settings Panel - hidden on mobile, hidden in focus mode \*\/\}\n\s*\{activePanel === "settings" && !isFocusMode && \(\n\s*<div className="flex-shrink-0">\n\s*<SettingsPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{\/\* Collaborators Panel - hidden on mobile, hidden in focus mode \*\/\}\n\s*\{activePanel === "collaborators" && !isFocusMode && \(\n\s*<div className="flex-shrink-0">\n\s*<CollaboratorsPanel [\s\S]*?<\/div>\n\s*\)\}/g, '');

content = content.replace(/\{activePanel === "settings" && !isFocusMode && canDeploy && \(\n\s*<div className="flex-shrink-0 border-t border-border-base bg-card p-4">\n\s*<div className="flex flex-col space-y-4">\n\s*<h3 className="text-sm font-medium text-foreground-base">Deploy to Custom Domain<\/h3>\n\s*<p className="text-xs text-foreground-muted">[\s\S]*?<\/div>\n\s*\)\}/g, '');

// 1994: remove terminal rendering logic
content = content.replace(/\{showTerminal && activePanel === "terminal" && \(\n\s*<TerminalPanel [\s\S]*?\n\s*\/>\n\s*\)\}/g, '');

// Generic fallbacks in case regexes missed something because of multiline whitespace:
content = content.replace(/\{mobileTab === "git" && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{mobileTab === "terminal" && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{mobileTab === "settings" && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{mobileTab === "deployments" && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{mobileTab === "collaborators" && \([\s\S]*?<\/div>\s*\)\}/g, '');

content = content.replace(/\{activePanel === "git" && !isFocusMode && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{activePanel === "settings" && !isFocusMode && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{activePanel === "collaborators" && !isFocusMode && \([\s\S]*?<\/div>\s*\)\}/g, '');
content = content.replace(/\{activePanel === "settings" && !isFocusMode && canDeploy && \([\s\S]*?<\/div>\s*\)\}/g, '');

content = content.replace(/\{showTerminal && activePanel === "terminal" && \([\s\S]*?TerminalPanel[\s\S]*?\/>\s*\)\}/g, '');

fs.writeFileSync(path, content);
