import React, { useState, useEffect } from "react";
import { useUITheme } from "../hooks/useUITheme";
import { THEMES, UITheme, ThemeDefinition } from "../lib/themes";
import { cn } from "../lib/utils";
import { Check, Settings, Palette, Save, Monitor, Code2, Play, Terminal } from "lucide-react";
import Navbar from "./Navbar";
import { motion } from "framer-motion";

export default function ThemeStudio() {
  const { theme, changeTheme, customTheme, setCustomTheme } = useUITheme();
  
  // Local state for the custom theme builder
  const [localCustom, setLocalCustom] = useState<Record<string, string>>(
    customTheme || THEMES.find(t => t.id === 'dark')?.vars || {}
  );

  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  useEffect(() => {
    // If we switch to 'custom', update CSS vars live without saving yet
    if (activeTab === "custom") {
      const root = document.documentElement;
      Object.entries(localCustom).forEach(([k, v]) => root.style.setProperty(k, v));
      root.setAttribute("data-theme", "custom");
    } else {
      // Re-apply the selected theme
      changeTheme(theme);
    }
    // eslint-disable-next-line
  }, [activeTab, localCustom]);

  const handleCustomChange = (key: string, value: string) => {
    setLocalCustom(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveCustom = () => {
    setCustomTheme(localCustom);
    changeTheme("custom");
  };

  return (
    <div className="min-h-screen bg-base text-primary flex flex-col font-sans transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid md:grid-cols-2 gap-8">
        
        {/* Left column: Controls */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Palette className="w-8 h-8 text-accent" />
              Theme Studio
            </h1>
            <p className="text-secondary text-sm">
              Customize your development environment's appearance. Changes apply instantly across all your devices.
            </p>
          </div>

          <div className="flex gap-4 border-b border-border-base pb-1">
            <button
              onClick={() => setActiveTab("presets")}
              className={cn(
                "pb-2 text-sm font-bold border-b-2 transition-colors",
                activeTab === "presets" ? "border-accent text-primary" : "border-transparent text-secondary hover:text-primary"
              )}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={cn(
                "pb-2 text-sm font-bold border-b-2 transition-colors",
                activeTab === "custom" ? "border-accent text-primary" : "border-transparent text-secondary hover:text-primary"
              )}
            >
              Custom Theme
            </button>
          </div>

          {activeTab === "presets" ? (
            <div className="grid grid-cols-2 gap-4">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => changeTheme(t.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                    theme === t.id
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border-base bg-surface hover:border-accent/50"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-full border border-border-base flex items-center justify-center flex-shrink-0 shadow-inner"
                    style={{ background: t.preview }}
                  >
                    {theme === t.id && <Check className="w-5 h-5 text-white mix-blend-difference" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{t.label}</h3>
                    <p className="text-[11px] text-secondary">{t.description}</p>
                  </div>
                </button>
              ))}
              
              {/* Custom theme selector button */}
              {customTheme && (
                <button
                  onClick={() => changeTheme("custom")}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                    theme === "custom"
                      ? "border-accent bg-accent/10 ring-1 ring-accent"
                      : "border-border-base bg-surface hover:border-accent/50"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-full border border-border-base flex items-center justify-center flex-shrink-0 shadow-inner"
                    style={{ background: customTheme['--bg-base'] || '#000' }}
                  >
                    {theme === "custom" && <Check className="w-5 h-5 text-white mix-blend-difference" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">My Custom Theme</h3>
                    <p className="text-[11px] text-secondary">Your personalized colors</p>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 bg-surface p-6 rounded-3xl border border-border-base shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Build Your Theme</h3>
                <button
                  onClick={handleSaveCustom}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  Save & Apply
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {Object.entries(localCustom).map(([key, val]) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-[11px] font-mono text-secondary truncate block">
                      {key.replace("--", "")}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border-base shadow-sm shrink-0">
                        <input
                          type="color"
                          value={val.length === 7 ? val : '#ffffff'}
                          onChange={(e) => handleCustomChange(key, e.target.value)}
                          className="absolute -inset-2 w-12 h-12 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleCustomChange(key, e.target.value)}
                        className="flex-1 bg-base border border-border-base rounded-lg px-3 py-1.5 text-xs font-mono text-primary outline-none focus:border-accent transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Live Preview */}
        <div className="h-[600px] sticky top-8 flex flex-col rounded-3xl border border-border-base overflow-hidden shadow-2xl ring-1 ring-white/5">
          {/* Mock IDE Window Header */}
          <div className="h-10 bg-surface border-b border-border-base flex items-center px-4 gap-2 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="mx-auto px-4 py-1 rounded-md bg-base text-[10px] font-mono text-secondary border border-border-base">
              Theme Preview
            </div>
          </div>

          {/* Mock IDE Content */}
          <div className="flex-1 flex bg-base overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 border-r border-border-base bg-surface flex flex-col p-3 gap-2">
              <div className="text-[10px] font-bold uppercase text-secondary mb-2">Explorer</div>
              <div className="flex items-center gap-2 text-xs text-primary px-2 py-1.5 rounded-lg bg-accent/10 text-accent font-medium">
                <Code2 className="w-4 h-4" /> index.ts
              </div>
              <div className="flex items-center gap-2 text-xs text-secondary px-2 py-1.5 hover:text-primary">
                <Settings className="w-4 h-4" /> config.json
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col">
              <div className="h-10 border-b border-border-base flex items-center px-3 bg-surface/50">
                <div className="px-4 py-1.5 border-b-2 border-accent text-xs font-medium text-primary">
                  index.ts
                </div>
              </div>
              <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-secondary overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
                <span className="text-purple-400">import</span> &#123; createTheme &#125; <span className="text-purple-400">from</span> <span className="text-green-400">"@devos/ui"</span>;
                <br /><br />
                <span className="text-purple-400">export const</span> <span className="text-blue-400">theme</span> = createTheme(&#123;
                <br />
                &nbsp;&nbsp;colors: &#123;<br />
                &nbsp;&nbsp;&nbsp;&nbsp;primary: <span className="text-green-400">"{localCustom['--text-primary'] || '#fff'}"</span>,<br />
                &nbsp;&nbsp;&nbsp;&nbsp;background: <span className="text-green-400">"{localCustom['--bg-base'] || '#000'}"</span>,<br />
                &nbsp;&nbsp;&nbsp;&nbsp;accent: <span className="text-green-400">"{localCustom['--accent'] || '#3b82f6'}"</span><br />
                &nbsp;&nbsp;&#125;
                <br />
                &#125;);
                <br /><br />
                <span className="text-secondary/50">// The colors will update as you customize!</span>
              </div>

              {/* Terminal */}
              <div className="h-40 border-t border-border-base bg-surface p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold uppercase text-secondary">Terminal</div>
                  <Terminal className="w-3.5 h-3.5 text-secondary" />
                </div>
                <div className="flex-1 font-mono text-xs text-green-400 flex flex-col justify-end">
                  <div>$ npm run build</div>
                  <div className="text-secondary mt-1">Building theme artifacts...</div>
                  <div className="text-accent mt-1">✓ Theme generated successfully in 120ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
