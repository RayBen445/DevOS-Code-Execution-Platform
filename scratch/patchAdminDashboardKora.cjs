const fs = require('fs');
const path = 'src/pages/AdminDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add KoraChatWidget import
if (!content.includes('import KoraChatWidget')) {
  content = content.replace(
    'import AdminThemesTab from "../components/AdminThemesTab";',
    'import AdminThemesTab from "../components/AdminThemesTab";\nimport KoraChatWidget from "../components/KoraChatWidget";'
  );
}

// Add Bot to lucide-react imports if not there
if (!content.includes('Bot,')) {
  content = content.replace(
    'import {',
    'import {\n  Bot,'
  );
}

// Add 'kora' to Tab
if (!content.includes('"kora"')) {
  content = content.replace(
    'type Tab = "overview" | "templates" | "themes" | "users" | "credits" | "notifications" | "redeem" | "posts" | "reserved" | "polls" | "feedback" | "deletions" | "maintenance" | "email" | "communities" | "organizations" | "projects" | "site" | "events" | "learn";',
    'type Tab = "overview" | "templates" | "themes" | "users" | "credits" | "notifications" | "redeem" | "posts" | "reserved" | "polls" | "feedback" | "deletions" | "maintenance" | "email" | "communities" | "organizations" | "projects" | "site" | "events" | "learn" | "kora";'
  );
}

// Add 'kora' tab definition
if (!content.includes('id: "kora"')) {
  content = content.replace(
    '{ id: "learn", label: "Learn", icon: <BookOpen className="w-5 h-5" /> },',
    '{ id: "learn", label: "Learn", icon: <BookOpen className="w-5 h-5" /> },\n    { id: "kora", label: "KORA AI", icon: <Bot className="w-5 h-5" /> },'
  );
}

// Add 'kora' title string
if (!content.includes('activeTab === "kora" && "Chat with KORA"')) {
  content = content.replace(
    '{activeTab === "learn" && "Manage learning topics and courses"}',
    '{activeTab === "learn" && "Manage learning topics and courses"}\n                  {activeTab === "kora" && "Chat with KORA"}'
  );
}

// Render KoraChatWidget content block
if (!content.includes('<KoraChatWidget />')) {
  content = content.replace(
    '{activeTab === "learn" && (',
    '{activeTab === "kora" && (\n          <div className="space-y-6" style={{ height: "calc(100vh - 200px)" }}>\n            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-6 h-full flex flex-col">\n              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">\n                <Bot className="w-6 h-6 text-blue-400" />\n                KORA AI Assistant\n              </h3>\n              <p className="text-gray-400 mb-6 text-sm">Access the live KORA Backend API directly from the dashboard.</p>\n              <div className="flex-1 min-h-0">\n                <KoraChatWidget />\n              </div>\n            </div>\n          </div>\n        )}\n\n        {activeTab === "learn" && ('
  );
}

fs.writeFileSync(path, content);
console.log('AdminDashboard patched successfully');
