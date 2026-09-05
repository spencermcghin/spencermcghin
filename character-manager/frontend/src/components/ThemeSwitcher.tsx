import { useState, useEffect } from 'react';
import './ThemeSwitcher.css';

export const THEMES = [
  { id: 'gothic', name: 'Gothic', swatch: 'linear-gradient(135deg,#0a0908,#c6a86d)' },
  { id: 'parchment', name: 'Parchment', swatch: 'linear-gradient(135deg,#f0e4cc,#8c2f28)' },
  { id: 'forest', name: 'Forest Realm', swatch: 'linear-gradient(135deg,#0c1a12,#4fc98a)' },
  { id: 'clean', name: 'Daylight', swatch: 'linear-gradient(135deg,#eef0f6,#5b5bd6)' },
] as const;

const DEFAULT_THEME = 'gothic';
const STORAGE_KEY = 'theme';

/** Themes that have been renamed, so a stored choice still resolves. */
const LEGACY_IDS: Record<string, string> = {
  modern: 'clean',
  'dark-fantasy': 'gothic',
};

function normalize(id: string | null): string {
  if (!id) return DEFAULT_THEME;
  const mapped = LEGACY_IDS[id] ?? id;
  return THEMES.some((t) => t.id === mapped) ? mapped : DEFAULT_THEME;
}

export function applyTheme(id: string) {
  // The default lives on bare :root, so it carries no attribute.
  if (id === DEFAULT_THEME) delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY));
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Private browsing can refuse writes; the theme still applies for now.
    }
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div className="theme-switcher">
      {open && <div className="theme-scrim" onClick={() => setOpen(false)} />}

      <div className={`theme-menu ${open ? 'is-open' : ''}`} role="listbox">
        <p className="theme-menu-label">Theme</p>
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="option"
            aria-selected={t.id === theme}
            className={`theme-option ${t.id === theme ? 'is-active' : ''}`}
            onClick={() => {
              setTheme(t.id);
              setOpen(false);
            }}
          >
            <span className="theme-swatch" style={{ background: t.swatch }} />
            {t.name}
          </button>
        ))}
      </div>

      <button
        className="theme-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Theme: ${active.name}. Change theme.`}
      >
        <span className="theme-swatch" style={{ background: active.swatch }} />
        <span className="theme-trigger-text">{active.name}</span>
      </button>
    </div>
  );
}
