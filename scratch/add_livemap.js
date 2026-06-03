import fs from 'fs';

const path = 'c:/Users/DELL/Documents/GitHub/DevOS-Code-Execution-Platform/src/components/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import LiveMap')) {
  content = content.replace(
    'import CustomSelect from "./CustomSelect";',
    'import CustomSelect from "./CustomSelect";\nimport LiveMap from "./LiveMap";'
  );
}

if (!content.includes('<LiveMap')) {
  content = content.replace(
    '<div className="mt-24 pt-12 border-t border-border-base flex flex-col items-center gap-4">',
    '<LiveMap className="mt-16 mb-16" />\n\n      <div className="mt-24 pt-12 border-t border-border-base flex flex-col items-center gap-4">'
  );
}

fs.writeFileSync(path, content);
console.log('Dashboard.tsx updated with LiveMap');
