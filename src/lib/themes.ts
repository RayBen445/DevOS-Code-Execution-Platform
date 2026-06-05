/**
 * UI Themes — defines CSS custom-property overrides applied to :root.
 * The default "dark" theme is the existing design; all others are variants.
 */
export type UITheme = string;

export interface ThemeDefinition {
  id: UITheme;
  label: string;
  description: string;
  /** Preview colour shown in the switcher */
  preview: string;
  /** CSS custom properties to inject when this theme is active */
  vars: Record<string, string>;
  isPremium?: boolean;
  price?: number;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'system',
    label: 'System',
    description: 'Follow your OS theme',
    preview: 'linear-gradient(135deg,#111827 0%, #f8fafc 100%)',
    vars: {},
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Classic dark mode',
    preview: '#111827',
    vars: {
      '--bg-base': '#0B0F17',
      '--bg-surface': '#111827',
      '--bg-card': '#111',
      '--border-base': 'rgba(255,255,255,0.08)',
      '--text-primary': '#ffffff',
      '--text-secondary': 'rgba(255,255,255,0.5)',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Deep purple tones',
    preview: '#0d0d1f',
    vars: {
      '--bg-base': '#0d0d1f',
      '--bg-surface': '#13132b',
      '--bg-card': '#18183a',
      '--border-base': 'rgba(139,92,246,0.15)',
      '--text-primary': '#e8e8ff',
      '--text-secondary': 'rgba(232,232,255,0.5)',
      '--accent': '#8b5cf6',
      '--accent-hover': '#7c3aed',
    },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Deep-sea teal',
    preview: '#071f2e',
    vars: {
      '--bg-base': '#071f2e',
      '--bg-surface': '#0e2c3f',
      '--bg-card': '#0c2a3b',
      '--border-base': 'rgba(20,184,166,0.15)',
      '--text-primary': '#e0f4f1',
      '--text-secondary': 'rgba(224,244,241,0.5)',
      '--accent': '#14b8a6',
      '--accent-hover': '#0d9488',
    },
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean light mode',
    preview: '#f8fafc',
    vars: {
      '--bg-base': '#f8fafc',
      '--bg-surface': '#ffffff',
      '--bg-card': '#f1f5f9',
      '--border-base': 'rgba(0,0,0,0.08)',
      '--text-primary': '#0f172a',
      '--text-secondary': 'rgba(15,23,42,0.55)',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Warm dusk gradient tones',
    preview: '#2a1633',
    vars: {
      '--bg-base': '#140f1f',
      '--bg-surface': '#1e1730',
      '--bg-card': '#261b3b',
      '--border-base': 'rgba(251,146,60,0.2)',
      '--text-primary': '#fff7ed',
      '--text-secondary': 'rgba(255,237,213,0.6)',
      '--accent': '#fb923c',
      '--accent-hover': '#f97316',
    },
  },
  {
    id: 'hacker',
    label: 'Hacker',
    description: 'Matrix-style green on black',
    preview: '#000000',
    isPremium: true,
    price: 50,
    vars: {
      '--bg-base': '#000000',
      '--bg-surface': '#0a0a0a',
      '--bg-card': '#111111',
      '--border-base': 'rgba(34,197,94,0.3)',
      '--text-primary': '#4ade80',
      '--text-secondary': 'rgba(74,222,128,0.7)',
      '--accent': '#22c55e',
      '--accent-hover': '#16a34a',
    },
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neon pink and yellow dystopia',
    preview: '#fdfb24',
    isPremium: true,
    price: 100,
    vars: {
      '--bg-base': '#05051a',
      '--bg-surface': '#0f0f2a',
      '--bg-card': '#1a1a3a',
      '--border-base': 'rgba(236,72,153,0.4)',
      '--text-primary': '#fdfb24',
      '--text-secondary': '#00f0ff',
      '--accent': '#ec4899',
      '--accent-hover': '#db2777',
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'A dark theme for vampires',
    preview: '#282a36',
    isPremium: true,
    price: 75,
    vars: {
      '--bg-base': '#282a36',
      '--bg-surface': '#44475a',
      '--bg-card': '#282a36',
      '--border-base': 'rgba(98,114,164,0.5)',
      '--text-primary': '#f8f8f2',
      '--text-secondary': '#6272a4',
      '--accent': '#ff79c6',
      '--accent-hover': '#bd93f9',
    },
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Arctic, north-bluish clean',
    preview: '#2e3440',
    isPremium: true,
    price: 75,
    vars: {
      '--bg-base': '#2e3440',
      '--bg-surface': '#3b4252',
      '--bg-card': '#434c5e',
      '--border-base': 'rgba(76,86,106,0.5)',
      '--text-primary': '#d8dee9',
      '--text-secondary': '#e5e9f0',
      '--accent': '#88c0d0',
      '--accent-hover': '#81a1c1',
    },
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Outrun style retro neon',
    preview: '#241b2f',
    isPremium: true,
    price: 100,
    vars: {
      '--bg-base': '#262335',
      '--bg-surface': '#241b2f',
      '--bg-card': '#171520',
      '--border-base': 'rgba(255,126,219,0.3)',
      '--text-primary': '#f92aad',
      '--text-secondary': '#36f9f6',
      '--accent': '#f92aad',
      '--accent-hover': '#36f9f6',
    },
  },
];

/** Apply a theme by injecting CSS variables onto <html> */
export function applyTheme(theme: UITheme, customVars?: Record<string, string>): void {
  const resolvedTheme: UITheme = theme === "system"
    ? (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  const root = document.documentElement;

  // Enable smooth cross-fade for the duration of the switch
  root.classList.add("theme-transitioning");
  
  if (resolvedTheme === "custom" && customVars) {
    Object.entries(customVars).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    const def = THEMES.find((t) => t.id === resolvedTheme) ?? THEMES[1];
    Object.entries(def.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  root.setAttribute("data-theme", resolvedTheme);
  // Remove transitioning class after the CSS transition completes (250 ms)
  setTimeout(() => root.classList.remove("theme-transitioning"), 300);
}
