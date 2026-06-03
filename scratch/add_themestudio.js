import fs from 'fs';

const path = 'c:/Users/DELL/Documents/GitHub/DevOS-Code-Execution-Platform/src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import ThemeStudio')) {
  content = content.replace(
    'import SettingsPage from "./pages/SettingsPage";',
    'import SettingsPage from "./pages/SettingsPage";\nimport ThemeStudio from "./components/ThemeStudio";'
  );
}

if (!content.includes('path="/theme-studio"')) {
  content = content.replace(
    '<Route path="/settings" element={withPageMaintenance("/settings", <SettingsPage />)} />',
    '<Route path="/settings" element={withPageMaintenance("/settings", <SettingsPage />)} />\n            <Route path="/theme-studio" element={withPageMaintenance("/theme-studio", <ThemeStudio />)} />'
  );
}

fs.writeFileSync(path, content);
console.log('App.tsx updated');
