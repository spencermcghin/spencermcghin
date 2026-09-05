# Theme Guide

The app is gothic dark by default. Three alternates are available from the pill
in the bottom-right corner.

| Theme | `data-theme` | Palette |
|---|---|---|
| **Gothic** (default) | *(none)* | Soot and candlelight, antique gold, a bruise of oxblood |
| Parchment | `parchment` | Aged vellum + oxblood |
| Forest Realm | `forest` | Deep canopy + jade |
| Daylight | `clean` | Porcelain + indigo |

## Type

Three faces, each with a job:

- **Inter** — all body copy, form fields, buttons and dense lists. Chosen for
  legibility at small sizes on a dark ground, where a display serif would fall
  apart.
- **Cormorant Garamond** — page titles and character names. High contrast and
  dramatic at display sizes, still perfectly readable.
- **Cinzel** — section labels, the wordmark and the eyebrow. Roman capitals
  read as carved rather than typed.
- **Pirata One** — blackletter, used *only* for drop caps and the fleuron in
  the ornamental divider. A word or two of blackletter is flavour; a paragraph
  of it is a puzzle, so it never carries information the reader needs.

All four load from Google Fonts with system fallbacks, so the app degrades to
readable text if they are blocked.

## How theming works

Themes are **design tokens**, not separate stylesheets. `src/index.css`
declares the token set on `:root` — which *is* the gothic theme — and each
alternate re-declares only those tokens under a `[data-theme="..."]` selector:

```css
:root                  { --accent: #c6a86d; --bg: #0a0908; /* ... */ }
[data-theme='forest']  { --accent: #4fc98a; --bg: #0c1a12; /* ... */ }
```

`src/App.css` references tokens exclusively — no component rule contains a
literal colour. Switching themes sets one attribute on `<html>`; every colour
updates instantly with no network request and no cascade conflict.

Two tokens control atmosphere rather than colour:

- `--grain` — strength of the film-grain overlay, which stops the large
  background gradients banding.
- `--falloff` — how much light drops off toward the edges of the page. `0`
  keeps a theme evenly lit; Gothic runs high, so the page reads as candlelit.

The choice is stored in `localStorage` under `theme`, and an inline script in
`index.html` applies it before first paint so there is no flash of the default
palette. Renamed themes are mapped there and in the switcher, so an existing
visitor's stored choice still resolves.

## Adding a theme

1. Add a `[data-theme='your-id']` block to `src/index.css` overriding the tokens.
2. Add an entry to `THEMES` in `src/components/ThemeSwitcher.tsx` with a
   matching `id` and a `swatch` gradient for the picker.

No component CSS needs to change.

## Motion

The drifting background and every transition are disabled under
`prefers-reduced-motion: reduce`.
