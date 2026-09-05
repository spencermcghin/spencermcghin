import { useState, useEffect } from 'react';
import './ThemeSwitcher.css';

const themes = [
  { id: 'default', name: 'Modern Clean', file: null },
  { id: 'dark-fantasy', name: 'Dark Fantasy', file: '/themes/dark-fantasy.css' },
  { id: 'parchment', name: 'Parchment', file: '/themes/parchment.css' },
  { id: 'forest-realm', name: 'Forest Realm', file: '/themes/forest-realm.css' },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'default';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Remove any existing theme stylesheets
    const existingTheme = document.getElementById('theme-stylesheet');
    if (existingTheme) {
      existingTheme.remove();
    }

    // Load new theme if not default
    const theme = themes.find(t => t.id === currentTheme);
    if (theme && theme.file) {
      const link = document.createElement('link');
      link.id = 'theme-stylesheet';
      link.rel = 'stylesheet';
      link.href = theme.file;
      document.head.appendChild(link);
    }

    // Save theme preference
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    setIsOpen(false);
  };

  return (
    <div className="theme-switcher">
      <button
        className="theme-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h4v12H4V4zm6 0h6v4h-6V4zm0 6h6v6h-6v-6z" />
        </svg>
        <span>Theme</span>
      </button>

      {isOpen && (
        <>
          <div
            className="theme-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="theme-menu">
            <h3>Choose Theme</h3>
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.id)}
              >
                <span className="theme-indicator"></span>
                {theme.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
