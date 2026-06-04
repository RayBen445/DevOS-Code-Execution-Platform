const fs = require('fs');

let content = fs.readFileSync('src/components/IDE.tsx', 'utf8');

content = content.replace(
`              <div className="flex-1 overflow-hidden">
                <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
              </div>
            </div>
          )}
        </div>
      </div>`,
`              <div className="flex-1 overflow-hidden">
                <PreviewPanel projectId={projectId} files={buildPreviewFiles ?? files} entryFile={project?.entryFile} saveKey={previewSaveKey} />
              </div>
            </Panel>
            </>
          )}
        </PanelGroup>
      </div>`
);

fs.writeFileSync('src/components/IDE.tsx', content, 'utf8');
console.log("Updated IDE.tsx");
