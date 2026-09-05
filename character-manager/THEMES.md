# Theme Guide

The LARP Character Manager includes four distinct visual themes to match different roleplaying aesthetics.

## Available Themes

### 1. Modern Clean (Default)
- **Style**: Contemporary, card-based design
- **Colors**: Blues, grays, white backgrounds
- **Best for**: Clean, professional look; easy reading
- **Font**: System fonts (sans-serif)

### 2. Dark Fantasy
- **Style**: Gothic medieval aesthetic
- **Colors**: Dark browns, blacks, gold accents
- **Best for**: Dark fantasy, grimdark settings
- **Font**: Cinzel (serif)
- **Features**: 
  - Gold accents and borders
  - Gradient backgrounds
  - Gothic atmosphere
  - Glowing text effects

### 3. Parchment
- **Style**: Classic D&D aged paper
- **Colors**: Beige, tan, browns
- **Best for**: Traditional fantasy, D&D campaigns
- **Font**: Merriweather, Garamond (serif)
- **Features**:
  - Parchment texture background
  - Ornamental corner decorations
  - Double borders
  - Aged paper aesthetic

### 4. Forest Realm
- **Style**: Nature-inspired earthy design
- **Colors**: Greens, earth tones
- **Best for**: Druid campaigns, nature settings
- **Font**: Lora, Georgia (serif)
- **Features**:
  - Deep forest greens
  - Natural gradients
  - Organic feel
  - Glowing accents

## How to Switch Themes

1. Click the **Theme** button in the bottom-right corner
2. Select your preferred theme from the menu
3. Your choice is saved automatically in browser storage

## Technical Details

- Themes are CSS-only, no JavaScript required
- Theme preference persists across sessions
- Each theme is a standalone CSS file
- Themes override the base App.css styles
- All themes are fully responsive

## Customizing Themes

Theme files are located in `frontend/public/themes/` (served as static assets so they
load the same way in dev and in a production build):
- `dark-fantasy.css`
- `parchment.css`
- `forest-realm.css`

You can modify these files or create new themes following the same CSS structure.
