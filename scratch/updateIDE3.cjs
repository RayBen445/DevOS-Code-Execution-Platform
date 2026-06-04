const fs = require('fs');

let content = fs.readFileSync('src/components/IDE.tsx', 'utf8');

const targetRegex = /<PreviewPanel projectId=\{projectId\} files=\{buildPreviewFiles \?\? files\} entryFile=\{project\?\.entryFile\} saveKey=\{previewSaveKey\} \/>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>/;

const replacement = `<PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
              </div>
            </Panel>
            </>
          )}
        </PanelGroup>
      </div>`;

content = content.replace(targetRegex, replacement);

fs.writeFileSync('src/components/IDE.tsx', content, 'utf8');
console.log("Updated IDE.tsx with regex replacement.");
