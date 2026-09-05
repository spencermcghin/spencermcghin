import { useState, useEffect } from 'react';
import './ThemeSwitcher.css';

export const THEMES = [
  { id: 'modern', name: 'Modern Clean', swatch: 'linear-gradient(135deg,#eef0f6,#5b5bd6)' },
  { id: 'dark-fantasy', name: 'Dark Fantasy', swatch: 'linear-gradient(135deg,#0d0a0a,#d4af37)' },
  { id: 'parchment', name: 'Parchment', swatch: 'linear-gradient(135deg,#f0e4cc,#8c2f28)' },
  { id: 'forest', name: 'Forest Realm', swatch: 'linear-gradient(135deg,#0c1a12,#4fc98a)' },
] as const;

const STORAGE_KEY = 'theme';

export function applyTheme(id: string) {
  if (id === 'modern') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = id;
  }
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'modern'
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
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
