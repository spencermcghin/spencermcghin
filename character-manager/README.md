# LARP Character Manager

A modern web application for managing live roleplaying (LARP) characters. Track character stats, attributes, skills, inventory, and more.

## Features

- Create and manage multiple LARP characters
- Track character attributes (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
- Manage skills and inventory
- Add detailed character backgrounds and notes
- **4 Visual Themes**: Switch between Modern Clean, Dark Fantasy, Parchment, and Forest Realm
- Clean, responsive UI
- Theme preferences saved automatically

## Tech Stack

### Frontend
- React with TypeScript
- Vite (build tool)
- React Router (navigation)
- Axios (API calls)

### Backend
- Node.js with Express
- TypeScript
- RESTful API architecture
- CORS enabled

## Project Structure

```
character-manager/
├── backend/          # Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd character-manager
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### Running the Application

#### Development Mode

1. Start the backend server:
```bash
cd backend
npm run dev
```
The API will run on `http://localhost:3000`

2. In a new terminal, start the frontend:
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

3. Open your browser and navigate to `http://localhost:5173`

#### Production Build

1. Build the backend:
```bash
cd backend
npm run build
npm start
```

2. Build the frontend:
```bash
cd frontend
npm run build
npm run preview
```

## API Endpoints

### Characters

- `GET /api/characters` - Get all characters
- `GET /api/characters/:id` - Get a specific character
- `POST /api/characters` - Create a new character
- `PUT /api/characters/:id` - Update a character
- `DELETE /api/characters/:id` - Delete a character

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## Persistence

Rulesets and characters are stored in Postgres as JSONB documents. A ruleset is
a deeply nested tree with polymorphic `Condition` nodes and is always read and
written whole, so normalising it into tables would add machinery without buying
a query the app needs.

Configure it with a standard connection string:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

Any Postgres works -- Render, Neon, Supabase, or a local instance. Tables are
created on boot, and an empty database is seeded with Eldritch as a starter
ruleset.

If `DATABASE_URL` is unset the API falls back to in-memory storage so `npm run
dev` needs no database. It logs a warning at startup; data is lost on restart.

**On Render's free tier:** free Postgres instances are deleted after 30 days,
and free web services have no persistent disk. For something longer-lived,
point `DATABASE_URL` at a provider with a non-expiring free tier.

## API

```
GET    /api/rulesets                    list projects
POST   /api/rulesets                    create a project
GET    /api/rulesets/:id                full ruleset
PUT    /api/rulesets/:id                replace a ruleset
DELETE /api/rulesets/:id                delete a ruleset and its characters
POST   /api/rulesets/import             import a ruleset from JSON

GET    /api/rulesets/:id/characters     characters in a ruleset
POST   /api/rulesets/:id/characters     create a character
GET    /api/characters/:id              raw character
GET    /api/characters/:id/sheet        character plus engine-computed
                                        balances, violations and the gated
                                        menu of what can be bought next
PUT    /api/characters/:id              update
DELETE /api/characters/:id              delete
```

## Rules engine

`shared/` holds a system-agnostic ruleset schema and the engine that enforces
it. Both the API and the UI evaluate rules through the same code, so a rule
behaves identically wherever it is checked. See [THEMES.md](./THEMES.md) for
theming and run the engine tests with:

```bash
npm run test:engine
```

## Themes

The app includes 4 visual themes optimized for different LARP aesthetics:

- **Modern Clean** - Contemporary card-based design (default)
- **Dark Fantasy** - Gothic medieval with gold accents
- **Parchment** - Classic D&D aged paper look
- **Forest Realm** - Nature-inspired earthy tones

Switch themes using the Theme button in the bottom-right corner. See [THEMES.md](./THEMES.md) for details.

## Deployment

### Deploy to Render (Free Tier)

1. Fork/push this repository to GitHub
2. Create a Render account at [render.com](https://render.com)
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and deploy both services

The `render.yaml` configuration deploys:
- Backend API as a Web Service (Node.js)
- Frontend as a Static Site

**Note**: Free tier services sleep after 15 minutes of inactivity. First request after sleeping may take 30-60 seconds.

### Manual Deployment

Backend and frontend can be deployed separately to any hosting service supporting Node.js and static sites.

## Development

### Backend
The backend uses in-memory storage by default. To add database persistence, integrate with MongoDB, PostgreSQL, or your preferred database.

### Frontend
The frontend is built with React and uses React Router for navigation. API calls are handled through Axios with a centralized API service.

## Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- User authentication and authorization
- Character import/export functionality
- Dice rolling mechanics
- Campaign management
- Character sheets PDF export
- Dark mode
- Mobile app version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
