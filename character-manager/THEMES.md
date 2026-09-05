# Theme Guide

Four palettes, switchable at runtime from the pill in the bottom-right corner.

## Themes

| Theme | `data-theme` | Palette |
|---|---|---|
| Modern Clean (default) | *(none)* | Porcelain + indigo |
| Dark Fantasy | `dark-fantasy` | Obsidian + gold leaf |
| Parchment | `parchment` | Aged vellum + oxblood |
| Forest Realm | `forest` | Deep canopy + jade |

## How it works

Themes are **design tokens**, not separate stylesheets. `src/index.css` declares
the full token set on `:root`, and each theme re-declares only those tokens under
a `[data-theme="..."]` selector:

```css
:root            { --accent: #5b5bd6; --bg: #eef0f6; /* ... */ }
[data-theme='forest'] { --accent: #4fc98a; --bg: #0c1a12; /* ... */ }
```

`src/App.css` references tokens exclusively — no component rule contains a literal
color. Switching themes sets one attribute on `<html>`; every color updates
instantly with no network request and no cascade conflict.

The selected theme is stored in `localStorage` under `theme`, and an inline script
in `index.html` applies it before first paint so there is no flash of the default
palette on load.

## Adding a theme

1. Add a `[data-theme='your-id']` block to `src/index.css` overriding the tokens.
2. Add an entry to the `THEMES` array in `src/components/ThemeSwitcher.tsx`
   with a matching `id` and a `swatch` gradient for the picker.

No component CSS needs to change.

## Notes

- Typography loads from Google Fonts (Cinzel, Cormorant Garamond, Inter) with
  system fallbacks, so the app degrades gracefully if fonts are blocked.
- The animated aurora background and all transitions are disabled automatically
  under `prefers-reduced-motion: reduce`.
