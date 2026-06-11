import React, { useState, useEffect } from "react";
import { useUITheme } from "../hooks/useUITheme";
import { THEMES } from "../lib/themes";
import { cn } from "../lib/utils";
import { Check, Settings, Palette, Save, Terminal, Share, Upload, Download, Smartphone, LayoutDashboard, Code2, ShieldAlert, X } from "lucide-react";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { publishCommunityTheme, createDbTheme } from "../lib/themeService";
import { auth } from "../lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "sonner";

const FONTS = [
  { id: "Inter", label: "Inter" },
  { id: "Geist", label: "Geist" },
  { id: "JetBrains Mono", label: "JetBrains Mono" },
  { id: "Poppins", label: "Poppins" }
];

export default function ThemeStudio() {
  const { theme, changeTheme, customTheme, setCustomTheme } = useUITheme();
  const [user] = useAuthState(auth);
  const isAdmin = user?.email?.endsWith('@devos.com') || false; // basic admin check for UI purposes

  const [localCustom, setLocalCustom] = useState<Record<string, string>>({
    '--bg-base': '#050816',
    '--bg-surface': '#0B1226',
    '--bg-card': '#111827',
    '--border-base': 'rgba(255,255,255,0.1)',
    '--text-primary': '#ffffff',
    '--text-secondary': 'rgba(255,255,255,0.6)',
    '--accent': '#6D4AFF',
    '--accent-hover': '#5B3BE8',
    '--radius-md': '0.75rem',
    '--shadow-md': '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    '--blur-md': '12px',
    '--font-sans': '"Inter", sans-serif',
    ...(customTheme || {})
  });

  const [activePreview, setActivePreview] = useState<"editor" | "dashboard" | "terminal" | "mobile">("editor");

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishName, setPublishName] = useState("");
  const [publishDesc, setPublishDesc] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [officialPrice, setOfficialPrice] = useState("50");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(localCustom).forEach(([k, v]) => root.style.setProperty(k, v));
    root.setAttribute("data-theme", "custom");
  }, [localCustom]);

  const handleCustomChange = (key: string, value: string) => {
    setLocalCustom(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveCustom = () => {
    setCustomTheme(localCustom);
    changeTheme("custom");
    toast.success("Theme saved and applied!");
  };

  const handleExport = () => {
    const jsonStr = JSON.stringify(localCustom, null, 2);
    navigator.clipboard.writeText(jsonStr);
    toast.success("Theme JSON copied to clipboard!");
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInput, setImportInput] = useState("");

  const parseThemeInput = (input: string) => {
    let extracted: Record<string, string> = {};

    // Try JSON
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          if (typeof v === 'string') {
            const kebab = k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            const cssVar = kebab.startsWith('--') ? kebab : `--${kebab}`;
            extracted[cssVar] = v;
          }
        });
        return extracted;
      }
    } catch (e) {}

    // Try Markdown
    const lines = input.split('\n');
    lines.forEach(line => {
      if (line.includes('|')) {
        const parts = line.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const key = parts[0];
          let val = parts[1];
          val = val.replace(/^`+/, '').replace(/`+$/, '');
          if (key.toLowerCase() === 'token' || key.includes('---')) return;
          const kebab = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          const cssVar = kebab.startsWith('--') ? kebab : `--${kebab}`;
          extracted[cssVar] = val;
        }
      }
    });

    return Object.keys(extracted).length > 0 ? extracted : null;
  };

  const handleApplyImport = () => {
    const parsed = parseThemeInput(importInput);
    if (!parsed) {
      toast.error("Could not parse valid theme tokens from input");
      return;
    }
    
    // Filter and map to allowed keys if needed, or just merge
    const mapped: Record<string, string> = {};
    const allowedKeys = [
      '--bg-base', '--bg-surface', '--bg-card', '--border-base',
      '--text-primary', '--text-secondary', '--accent', '--accent-hover',
      '--radius-md', '--shadow-md', '--blur-md', '--font-sans'
    ];
    
    // Some basic mappings in case they use slightly different names
    Object.entries(parsed).forEach(([k, v]) => {
      let finalKey = k;
      if (allowedKeys.includes(finalKey)) {
        mapped[finalKey] = v;
      } else {
        // loose matching
        const searchKey = finalKey.replace('--', '');
        const match = allowedKeys.find(a => a.includes(searchKey));
        if (match) mapped[match] = v;
      }
    });

    if (Object.keys(mapped).length === 0) {
       // if no strict matches, just merge everything to let them be flexible
       setLocalCustom(prev => ({ ...prev, ...parsed }));
    } else {
       setLocalCustom(prev => ({ ...prev, ...mapped }));
    }
    
    toast.success("Theme imported successfully!");
    setIsImportModalOpen(false);
    setImportInput("");
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error("Please sign in to publish themes.");
      return;
    }
    if (!publishName.trim()) {
      toast.error("Theme name is required.");
      return;
    }
    setIsPublishing(true);
    try {
      if (isOfficial && isAdmin) {
        await createDbTheme({
          id: publishName.toLowerCase().replace(/\\s+/g, '-'),
          label: publishName,
          description: publishDesc,
          preview: localCustom['--bg-base'] || '#000',
          vars: localCustom,
          isPremium: Number(officialPrice) > 0,
          price: Number(officialPrice)
        }, user.uid);
        toast.success("Published as Official Premium Theme!");
      } else {
        await publishCommunityTheme({
          name: publishName,
          description: publishDesc,
          vars: localCustom,
          authorId: user.uid,
          authorUsername: user.displayName || user.email?.split("@")[0] || "Anonymous",
        });
      }
      setIsPublishModalOpen(false);
      setPublishName("");
      setPublishDesc("");
    } catch (e: any) {
      toast.error(e.message || "Failed to publish theme");
    } finally {
      setIsPublishing(false);
    }
  };

  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col font-sans transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full p-2 md:p-8 gap-4 md:gap-8 overflow-hidden h-[calc(100vh-64px)] relative pb-16 md:pb-8">
        
        {/* Left Sidebar: Theme Panel */}
        <div className={cn(
          "w-full md:w-[380px] shrink-0 flex flex-col bg-surface border border-border-base rounded-2xl md:rounded-3xl shadow-xl overflow-hidden h-full",
          mobileTab === "editor" ? "flex" : "hidden md:flex"
        )}>
          <div className="p-4 md:p-6 border-b border-border-base bg-surface shrink-0">
            <h1 className="text-xl md:text-2xl font-black mb-1 flex items-center gap-2">
              <Palette className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              Theme Studio
            </h1>
            <p className="text-secondary text-xs">Create, customize and share premium themes</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 no-scrollbar">
            {/* Colors Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">Colors</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: '--bg-base', label: 'Background' },
                  { key: '--bg-surface', label: 'Surface' },
                  { key: '--bg-card', label: 'Card' },
                  { key: '--accent', label: 'Accent' }
                ].map(color => (
                  <div key={color.key} className="space-y-2">
                    <label className="text-[11px] font-bold text-secondary block">{color.label}</label>
                    <div className="relative group cursor-pointer h-12 rounded-xl overflow-hidden border border-border-base shadow-sm">
                      <input
                        type="color"
                        value={localCustom[color.key].length === 7 ? localCustom[color.key] : '#ffffff'}
                        onChange={(e) => handleCustomChange(color.key, e.target.value)}
                        className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer opacity-0"
                      />
                      <div className="absolute inset-0 flex items-center justify-center transition-opacity" style={{ background: localCustom[color.key] }}>
                         <span className="text-[10px] font-mono font-bold mix-blend-difference text-white uppercase opacity-0 group-hover:opacity-100">{localCustom[color.key]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Typography Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">Typography</h3>
              <div className="grid grid-cols-2 gap-2">
                {FONTS.map(font => (
                  <button
                    key={font.id}
                    onClick={() => handleCustomChange('--font-sans', `"${font.id}", sans-serif`)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-bold transition-all text-left",
                      localCustom['--font-sans']?.includes(font.id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border-base hover:border-white/20 text-secondary"
                    )}
                    style={{ fontFamily: `"${font.id}", sans-serif` }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Effects Section */}
            <section className="space-y-5">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">Effects</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-secondary">Corner Radius</label>
                  <span className="font-mono">{localCustom['--radius-md']}</span>
                </div>
                <input 
                  type="range" min="0" max="32" step="1"
                  value={parseFloat(localCustom['--radius-md']) * 16 || 12}
                  onChange={(e) => handleCustomChange('--radius-md', `${Number(e.target.value)/16}rem`)}
                  className="w-full accent-accent bg-border-base h-1.5 rounded-full appearance-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-secondary">Shadow Intensity</label>
                  <span className="font-mono opacity-50">RGB(0,0,0,X)</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1"
                  value={(localCustom['--shadow-md']?.match(/rgba\\(0,\\s*0,\\s*0,\\s*([\\d.]+)\\)/)?.[1] || 0.5) as number * 100}
                  onChange={(e) => handleCustomChange('--shadow-md', `0 10px 15px -3px rgba(0, 0, 0, ${Number(e.target.value)/100}), 0 4px 6px -4px rgba(0, 0, 0, ${Number(e.target.value)/100})`)}
                  className="w-full accent-accent bg-border-base h-1.5 rounded-full appearance-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-secondary">Backdrop Blur</label>
                  <span className="font-mono">{localCustom['--blur-md']}</span>
                </div>
                <input 
                  type="range" min="0" max="40" step="1"
                  value={parseInt(localCustom['--blur-md']) || 12}
                  onChange={(e) => handleCustomChange('--blur-md', `${e.target.value}px`)}
                  className="w-full accent-accent bg-border-base h-1.5 rounded-full appearance-none"
                />
              </div>
            </section>
          </div>

          <div className="p-4 border-t border-border-base bg-surface shrink-0 flex flex-col gap-2">
            <div className="flex gap-2">
              <button onClick={() => setIsImportModalOpen(true)} className="flex-1 py-2 bg-base border border-border-base rounded-xl text-xs font-bold hover:bg-white/5 transition-all text-secondary flex items-center justify-center gap-2"><Download className="w-3.5 h-3.5" /> Import</button>
              <button onClick={handleExport} className="flex-1 py-2 bg-base border border-border-base rounded-xl text-xs font-bold hover:bg-white/5 transition-all text-secondary flex items-center justify-center gap-2"><Upload className="w-3.5 h-3.5" /> Export</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsPublishModalOpen(true)} className="flex-1 py-3 bg-base border border-border-base rounded-xl text-sm font-bold hover:bg-white/5 transition-all flex justify-center items-center gap-2"><Share className="w-4 h-4"/> Publish Theme</button>
              <button onClick={handleSaveCustom} className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-accent/20"><Save className="w-4 h-4"/> Apply Local</button>
            </div>
          </div>
        </div>

        {/* Right Area: Live Preview */}
        <div className={cn(
          "flex-1 flex flex-col h-full bg-base rounded-2xl md:rounded-3xl border border-border-base overflow-hidden shadow-2xl relative",
          mobileTab === "preview" ? "flex" : "hidden md:flex"
        )}>
          {/* Top Preview Tabs */}
          <div className="h-14 bg-surface border-b border-border-base flex items-center justify-center gap-2 px-6 shrink-0 relative z-10">
            {[
              { id: "editor", icon: Code2, label: "Editor" },
              { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
              { id: "terminal", icon: Terminal, label: "Terminal" },
              { id: "mobile", icon: Smartphone, label: "Mobile" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePreview(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all",
                  activePreview === tab.id ? "bg-accent/10 text-accent" : "text-secondary hover:text-primary hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Preview Content Area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-base)' }}>
            
            <AnimatePresence mode="wait">
              {/* EDITOR PREVIEW */}
              {activePreview === "editor" && (
                <motion.div
                  key="editor"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-3xl aspect-[16/10] bg-surface rounded-[var(--radius-md)] border border-border-base overflow-hidden flex shadow-[var(--shadow-md)]"
                >
                  <div className="w-48 bg-base border-r border-border-base p-4 flex flex-col gap-3">
                    <div className="text-[10px] font-bold uppercase text-secondary">Explorer</div>
                    <div className="p-2 rounded-[var(--radius-md)] bg-accent/10 text-accent text-xs font-bold flex items-center gap-2"><Code2 className="w-3 h-3"/> theme.ts</div>
                    <div className="p-2 rounded-[var(--radius-md)] text-secondary text-xs hover:text-primary flex items-center gap-2"><Settings className="w-3 h-3"/> config.json</div>
                  </div>
                  <div className="flex-1 p-6 font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                     <span className="text-[#a78bfa]">export const</span> <span className="text-[#60a5fa]">DevOSTheme</span> = {'{'}
                     <br/><br/>
                     &nbsp;&nbsp;<span className="text-[#34d399]">name</span>: <span className="text-[#f472b6]">"Premium Design"</span>,<br/>
                     &nbsp;&nbsp;<span className="text-[#34d399]">author</span>: <span className="text-[#f472b6]">"@creator"</span>,<br/>
                     &nbsp;&nbsp;<span className="text-[#34d399]">isAwesome</span>: <span className="text-[#fbbf24]">true</span><br/>
                     <br/>
                     {'}'};
                  </div>
                </motion.div>
              )}

              {/* DASHBOARD PREVIEW */}
              {activePreview === "dashboard" && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-4xl h-[500px] bg-base rounded-[var(--radius-md)] border border-border-base overflow-hidden flex flex-col p-8 gap-6 shadow-[var(--shadow-md)]"
                >
                   <h2 className="text-2xl font-black">Dashboard</h2>
                   <div className="grid grid-cols-3 gap-4">
                     {[1,2,3].map(i => (
                       <div key={i} className="p-6 bg-surface rounded-[var(--radius-md)] border border-border-base shadow-[var(--shadow-md)]">
                         <div className="w-8 h-8 rounded-full bg-accent/20 mb-4 flex items-center justify-center"><Check className="w-4 h-4 text-accent"/></div>
                         <h3 className="font-bold mb-1">Metric {i}</h3>
                         <p className="text-2xl font-black text-accent">1,234</p>
                       </div>
                     ))}
                   </div>
                   <div className="flex-1 bg-surface rounded-[var(--radius-md)] border border-border-base shadow-[var(--shadow-md)] p-6">
                      <h3 className="font-bold mb-4">Activity</h3>
                      <div className="space-y-3">
                        <div className="h-4 w-full bg-white/5 rounded-full" />
                        <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                        <div className="h-4 w-5/6 bg-white/5 rounded-full" />
                      </div>
                   </div>
                </motion.div>
              )}

              {/* TERMINAL PREVIEW */}
              {activePreview === "terminal" && (
                <motion.div
                  key="terminal"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-2xl h-[400px] bg-card rounded-[var(--radius-md)] border border-border-base overflow-hidden flex flex-col shadow-[var(--shadow-md)]"
                >
                  <div className="h-10 bg-surface border-b border-border-base flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="p-4 font-mono text-sm flex-1 text-secondary">
                    <span className="text-accent">user@devos</span>:<span className="text-blue-400">~/project</span>$ npm install<br/>
                    <br/>
                    added 142 packages, and audited 143 packages in 2s<br/>
                    <br/>
                    <span className="text-green-400">24 packages are looking for funding</span><br/>
                    &nbsp;&nbsp;run `npm fund` for details<br/>
                    <br/>
                    found <span className="text-green-400">0</span> vulnerabilities<br/>
                    <br/>
                    <span className="text-accent">user@devos</span>:<span className="text-blue-400">~/project</span>$ <span className="animate-pulse">_</span>
                  </div>
                </motion.div>
              )}

              {/* MOBILE PREVIEW */}
              {activePreview === "mobile" && (
                <motion.div
                  key="mobile"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="w-[320px] h-[650px] bg-base rounded-[3rem] border-[8px] border-surface overflow-hidden flex flex-col shadow-[var(--shadow-md)] relative"
                >
                  <div className="absolute top-0 inset-x-0 h-6 bg-surface rounded-b-3xl mx-auto w-1/3 z-10" />
                  <div className="h-16 bg-surface/80 backdrop-blur-[var(--blur-md)] border-b border-border-base flex items-center justify-center font-bold relative z-0 pt-4">App</div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
                    <div className="p-4 bg-surface rounded-[var(--radius-md)] border border-border-base shadow-[var(--shadow-md)]">
                       <h4 className="font-bold mb-2">Welcome</h4>
                       <p className="text-xs text-secondary mb-4">Mobile experiences adapt perfectly to your custom theme.</p>
                       <button className="w-full py-3 bg-accent text-white rounded-[var(--radius-md)] font-bold text-xs shadow-[var(--shadow-md)]">Primary Action</button>
                    </div>
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex gap-4 p-3 bg-surface rounded-[var(--radius-md)] border border-border-base shadow-[var(--shadow-md)] items-center">
                        <div className="w-10 h-10 rounded-full bg-accent/20" />
                        <div className="flex-1">
                          <div className="h-3 w-1/2 bg-white/10 rounded-full mb-2" />
                          <div className="h-2 w-1/3 bg-white/5 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-base flex items-center justify-around z-50 px-4 pb-safe">
          <button onClick={() => setMobileTab("editor")} className={cn("flex flex-col items-center gap-1 p-2 rounded-xl flex-1", mobileTab === "editor" ? "text-accent bg-accent/10" : "text-secondary hover:text-primary")}>
            <Palette className="w-5 h-5"/>
            <span className="text-[10px] font-bold">Editor</span>
          </button>
          <button onClick={() => setMobileTab("preview")} className={cn("flex flex-col items-center gap-1 p-2 rounded-xl flex-1", mobileTab === "preview" ? "text-accent bg-accent/10" : "text-secondary hover:text-primary")}>
            <LayoutDashboard className="w-5 h-5"/>
            <span className="text-[10px] font-bold">Preview</span>
          </button>
        </div>
      </main>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl bg-base border border-border-base rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black mb-1">Import Theme</h2>
                  <p className="text-sm text-secondary">Paste a JSON object or a Markdown table.</p>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-secondary hover:text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col min-h-[300px] mb-6 relative group">
                <textarea 
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  className="w-full flex-1 bg-surface border border-border-base rounded-2xl p-6 font-mono text-sm focus:outline-none focus:border-accent text-primary resize-none shadow-inner"
                  placeholder={`{\n  "bgBase": "#050816",\n  "textPrimary": "#F8FAFC"\n}\n\nOR\n\n| Token | Value |\n| bg-base | #06070A |`}
                />
              </div>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-base">
                <div className="text-xs text-secondary font-medium">
                  {importInput.trim().length > 0 ? (
                    parseThemeInput(importInput) 
                      ? <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Valid format detected</span>
                      : <span className="text-red-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Invalid format</span>
                  ) : "Supports JSON & Markdown"}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-secondary hover:text-primary transition-colors">Cancel</button>
                  <button 
                    onClick={handleApplyImport} 
                    disabled={!importInput.trim() || !parseThemeInput(importInput)}
                    className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Apply Theme
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Publish Modal */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-base border border-border-base rounded-3xl p-8 shadow-2xl">
              <h2 className="text-2xl font-black mb-2">Publish Theme</h2>
              <p className="text-sm text-secondary mb-6">Share your custom theme with the world.</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Theme Name</label>
                  <input value={publishName} onChange={e => setPublishName(e.target.value)} className="w-full bg-surface border border-border-base rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent" placeholder="e.g. Neon Cyberpunk" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary mb-1">Description (Optional)</label>
                  <textarea value={publishDesc} onChange={e => setPublishDesc(e.target.value)} rows={3} className="w-full bg-surface border border-border-base rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none" placeholder="Describe your theme..." />
                </div>
                
                {isAdmin && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isOfficial} onChange={(e) => setIsOfficial(e.target.checked)} className="rounded border-border-base" />
                      <span className="text-sm font-bold text-orange-400 flex items-center gap-1"><ShieldAlert className="w-4 h-4"/> Publish as Official Premium Theme</span>
                    </label>
                    {isOfficial && (
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-orange-400/70">Price (Credits)</label>
                        <input type="number" value={officialPrice} onChange={(e) => setOfficialPrice(e.target.value)} className="w-24 bg-surface border border-orange-500/30 rounded-lg px-3 py-1 text-sm focus:outline-none" min="0" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setIsPublishModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-secondary hover:text-primary transition-colors">Cancel</button>
                <button onClick={handlePublish} disabled={isPublishing} className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                  {isPublishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}