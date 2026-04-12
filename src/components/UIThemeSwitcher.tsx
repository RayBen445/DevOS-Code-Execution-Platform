import { useUITheme } from "../hooks/useUITheme";
import { THEMES, UITheme } from "../lib/themes";
import { Palette, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface UIThemeSwitcherProps {
  /** If true, renders in compact pill form (e.g. in Navbar) */
  compact?: boolean;
  className?: string;
}

export default function UIThemeSwitcher({ compact, className }: UIThemeSwitcherProps) {
  const { theme, changeTheme } = useUITheme();

  if (compact) {
    return (
      <div className={cn("relative group", className)}>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-bold transition-all border border-white/5 hover:border-white/10"
          title="Switch UI theme"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden sm:inline capitalize">{theme}</span>
        </button>
        {/* Dropdown — uses CSS vars so it respects current theme */}
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5 border"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border-base)",
          }}
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTheme(t.id as UITheme)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left"
              style={{
                color: theme === t.id ? "var(--text-primary)" : "var(--text-secondary)",
                background: theme === t.id ? "rgba(59,130,246,0.10)" : "transparent",
                fontWeight: theme === t.id ? 600 : 400,
              }}
            >
              <span
                className="w-4 h-4 rounded-md flex-shrink-0 border"
                style={{ background: t.preview, borderColor: "var(--border-base)" }}
              />
              <span className="flex-1">{t.label}</span>
              {theme === t.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p
        className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        style={{ color: "var(--text-secondary)" }}
      >
        <Palette className="w-3.5 h-3.5" />
        UI Theme
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => changeTheme(t.id as UITheme)}
              className="relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border-base)",
                background: active ? "rgba(59,130,246,0.08)" : "var(--bg-card)",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {/* Theme colour preview swatch */}
              <span
                className="w-5 h-5 rounded-lg flex-shrink-0 border mt-0.5"
                style={{ background: t.preview, borderColor: "var(--border-base)" }}
              />
              <div className="min-w-0">
                <p className="font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                  {t.label}
                </p>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                  {t.description}
                </p>
              </div>
              {active && (
                <Check className="w-3.5 h-3.5 text-blue-400 absolute top-2 right-2 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
