/**
 * UI Themes — defines CSS custom-property overrides applied to :root.
 * The default "dark" theme is the existing design; all others are variants.
 */
export type UITheme = 'dark' | 'midnight' | 'ocean' | 'light';

export interface ThemeDefinition {
  id: UITheme;
  label: string;
  description: string;
  /** Preview colour shown in the switcher */
  preview: string;
  /** CSS custom properties to inject when this theme is active */
  vars: Record<string, string>;
}

export const THEMES: ThemeDefinition[] = [
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
];

/** Apply a theme by injecting CSS variables onto <html> */
export function applyTheme(theme: UITheme): void {
  const def = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const root = document.documentElement;
  Object.entries(def.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', theme);
}
