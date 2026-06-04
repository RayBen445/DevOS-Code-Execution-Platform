const fs = require('fs');

let content = fs.readFileSync('src/components/IDE.tsx', 'utf8');

// Insert state
const stateInjection = `  const autoOpenedInitialFileRef = useRef(false);

  // Splitter state
  const [splitWidth, setSplitWidth] = useState(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitDragStartX = useRef(0);
  const splitDragStartW = useRef(50);

  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    splitDragStartX.current = e.clientX;
    splitDragStartW.current = splitWidth;
  };

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - splitDragStartX.current;
      const deltaPercent = (deltaX / window.innerWidth) * 100;
      setSplitWidth(Math.max(20, Math.min(80, splitDragStartW.current + deltaPercent)));
    };
    const handleMouseUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);`;

content = content.replace(`  const autoOpenedInitialFileRef = useRef(false);`, stateInjection);

// Update Left Pane
content = content.replace(
  `{/* Left Pane: Explorer + Editor + Terminal */}
          <div className={cn(
            "flex flex-col border-r border-[#21262D] overflow-hidden",
            isPreviewFullscreen ? "hidden" : "flex-1"
          )}>`,
  `{/* Left Pane: Explorer + Editor + Terminal */}
          <div className={cn(
            "flex flex-col border-r border-[#21262D] overflow-hidden transition-[width] duration-0",
            isPreviewFullscreen ? "hidden" : ""
          )} style={{ width: isPreviewFullscreen ? "0%" : \`\${splitWidth}%\` }}>`
);

// Update Right Pane & Add Splitter
content = content.replace(
  `{/* Right Pane: Live Preview — hidden on mobile, hidden in focus mode */}
          {project?.systemType !== 'portfolio' && !isFocusMode && (
            <div className={cn(
              "bg-surface hidden md:flex flex-col border-l border-[#21262D] overflow-hidden",
              isPreviewFullscreen ? "flex-1" : "w-1/2"
            )}>`,
  `{/* Resizable Splitter */}
          {project?.systemType !== 'portfolio' && !isFocusMode && !isPreviewFullscreen && (
            <div 
              className="w-1 bg-[#21262D] hover:bg-blue-500/50 active:bg-blue-500 cursor-col-resize hidden md:block z-50 transition-colors"
              onMouseDown={handleSplitterMouseDown}
            />
          )}

          {/* Right Pane: Live Preview — hidden on mobile, hidden in focus mode */}
          {project?.systemType !== 'portfolio' && !isFocusMode && (
            <div className={cn(
              "bg-surface hidden md:flex flex-col overflow-hidden flex-1"
            )} style={{ width: isPreviewFullscreen ? "100%" : \`\${100 - splitWidth}%\` }}>`
);

fs.writeFileSync('src/components/IDE.tsx', content, 'utf8');
console.log("Added split width state.");
