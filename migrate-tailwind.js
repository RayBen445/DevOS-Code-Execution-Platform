import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

const classMappings = [
  // Base background mapping
  {
    regex: /bg-\[#(0a0a0a|0a0a0f|0b0b0b|0B0F17|0B0F19|0f0f0f|050505|060606|000000|0B0F17)\]/g,
    replacement: 'bg-base',
  },
  // Surface background mapping
  {
    regex: /bg-\[#(111827|0D1117|0d1117|1a2234|0f1621|1a1a2e|1e2a3a|1e293b|0f172a|111827)\]/g,
    replacement: 'bg-surface',
  },
  // Card background mapping
  {
    regex: /bg-\[#(111|111111|0d0d0d|1a1a1a|141414|181818|1c1c1c|121212|0c0c0c|100f0f|0e0e0e)\]/g,
    replacement: 'bg-card',
  },
  // Border colors
  {
    regex: /border-\[#(222|222222|1f2937|334155|2a2a2a|333|333333)\]/g,
    replacement: 'border-border-base',
  },
  {
    regex: /border-white\/(5|10|15|20|8)/g,
    replacement: 'border-border-base',
  }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let changedFilesCount = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      changedFilesCount += processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;

      for (const mapping of classMappings) {
        content = content.replace(mapping.regex, mapping.replacement);
      }

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        changedFilesCount++;
        console.log(`Updated: ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }

  return changedFilesCount;
}

console.log('Starting Tailwind migration...');
const count = processDirectory(SRC_DIR);
console.log(`Migration complete. Updated ${count} files.`);
