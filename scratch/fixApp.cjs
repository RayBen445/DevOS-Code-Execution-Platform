const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove the import
content = content.replace('import { ensureDevTeamOrg } from "./lib/orgService";\n', '');

// Remove the usage inside useEffect
content = content.replace('    ensureDevTeamOrg().catch(console.error);\n', '');

fs.writeFileSync(path, content);
console.log('App.tsx patched successfully');
