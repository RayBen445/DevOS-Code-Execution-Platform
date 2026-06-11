const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add import
content = content.replace(
  'import IDE from "./components/IDE";',
  'import IDE from "./components/IDE";\nimport PortfolioIDE from "./components/PortfolioIDE";'
);

// 2. Add ProjectIDEWrapper before App component
const wrapper = `
function ProjectIDEWrapper({ projectId, onBack }: { projectId: string; onBack?: () => void }) {
  const [systemType, setSystemType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    
    const projectRef = doc(db, "projects", projectId);
    unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        setSystemType(docSnap.data().systemType || 'react');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching project systemType:", error);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId]);

  if (loading) return <PremiumLoader />;

  if (systemType === "portfolio") {
    return <PortfolioIDE projectId={projectId} onBack={onBack} />;
  }
  
  return <IDE projectId={projectId} onBack={onBack} />;
}

export default function App() {`;

content = content.replace('export default function App() {', wrapper);

// 3. Replace <IDE projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
// Note: We need to use global replace for this.
content = content.split('<IDE projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />')
                 .join('<ProjectIDEWrapper projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />');

fs.writeFileSync(path, content);
console.log('App.tsx patched successfully.');
