import { useUITheme } from "../hooks/useUITheme";
import { THEMES } from "../lib/themes";
import { Palette } from "lucide-react";
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
        {/* Dropdown */}
        <div className="absolute right-0 top-full mt-2 w-44 bg-[#111827] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-1.5">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTheme(t.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                theme === t.id
                  ? "bg-white/10 text-white font-semibold"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <span
                className="w-4 h-4 rounded-md border border-white/10 flex-shrink-0"
                style={{ background: t.preview }}
              />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
        <Palette className="w-3.5 h-3.5" />
        UI Theme
      </p>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTheme(t.id)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all text-left",
              theme === t.id
                ? "border-blue-500 bg-blue-500/10 text-white font-semibold"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white"
            )}
          >
            <span
              className="w-5 h-5 rounded-lg border border-white/10 flex-shrink-0"
              style={{ background: t.preview }}
            />
            <div className="min-w-0">
              <p className="font-semibold leading-none">{t.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
