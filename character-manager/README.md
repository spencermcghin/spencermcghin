# LARP Character Manager

A web application for building LARP rulesets and the characters that play by
them. It is system-agnostic: a **Project** is one ruleset, and the app enforces
whatever rules that ruleset defines.

## Features

- Define a ruleset: currencies, skill trees, archetypes, progression tracks and
  cost modifiers
- Archetype-gated skills, so a tree can belong to a class or order
- A rules engine that enforces costs, prerequisites and level caps, and explains
  why anything is unavailable
- Characters validated continuously against their ruleset
- Import and export rulesets as JSON
- **4 Visual Themes**: Modern Clean, Dark Fantasy, Parchment, Forest Realm

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
├── shared/           # Ruleset schema + rules engine (used by both sides)
│   ├── rules-schema.ts
│   ├── engine.ts
│   ├── engine.test.ts
│   └── rulesets/eldritch.ts
├── backend/          # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/       # Store interface, Postgres and in-memory
│   │   ├── routes/
│   │   └── index.ts
│   └── tsconfig.json
├── frontend/         # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
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

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:pass@host:5432/dbname   # optional in dev
CORS_ORIGIN=https://your-frontend.example              # only for split deploys
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000/api
```

## Accounts

Each account gets its own space. Rulesets and characters belong to the account
that created them, and one account cannot read, edit or delete another's --
cross-account requests return 404 rather than 403, since a 403 would confirm
that an id exists.

New accounts are seeded with a private copy of Eldritch, so the app opens on a
worked example rather than an empty list.

How it works:

- **Cookie sessions, not tokens in localStorage.** The session cookie is
  `httpOnly` and `sameSite=lax`, so injected script cannot read it and it does
  not ride cross-site POSTs. `secure` is set when `NODE_ENV=production`.
- **Opaque session tokens, stored hashed.** The cookie carries 256 bits of
  randomness; the database stores only its SHA-256, so a leaked table does not
  yield usable sessions. Sessions are revoked server-side on sign out.
- **Passwords hashed with scrypt** from `node:crypto` -- memory-hard, built in,
  and no native module to fail to compile on a deploy host.
- Login reports the same message for an unknown address and a wrong password,
  and runs a hash either way so timing does not distinguish them.
- Failed logins are throttled per address and IP.

```
POST /api/auth/register    create an account and sign in
POST /api/auth/login       sign in
POST /api/auth/logout      revoke the current session
GET  /api/auth/me          the signed-in user, or 401
```

Everything under `/api/rulesets` and `/api/characters` requires a session.

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

The API can serve the built frontend from the same origin, so the app deploys
either as **one service** or as **two**. One service is simpler: no CORS, and
no build-time API URL to keep in sync.

### Railway (single service, recommended)

1. New Project → Deploy from GitHub repo
2. Set the service's **Root Directory** to `character-manager`
3. Add a **Postgres** database to the project. Railway injects `DATABASE_URL`
   into the service automatically -- nothing else to configure.
4. Deploy

`railway.json` builds both halves and starts the API, which detects
`frontend/dist` and serves it alongside `/api`. Railway's Postgres does not
expire, so data persists.

### Render (two services)

`render.yaml` deploys the API as a web service and the frontend as a static
site. This split needs `VITE_API_URL` set on the static site to the API's
public URL, because the two live on different origins. Set `DATABASE_URL` on
the API service.

Note that Render's free Postgres is deleted after 30 days and free web
services sleep after 15 minutes idle, so the first request after a pause takes
30--60 seconds.

### Anywhere else

Build both, then run the API with `DATABASE_URL` set:

```bash
npm run build:all
npm start
```

The API serves the frontend if it finds a build; point `FRONTEND_DIST` at it
if your layout differs.

## Development

### Backend
Express over the shared rules engine, with Postgres for storage. See
[Persistence](#persistence) for configuration.

### Frontend
React with React Router. It imports the same schema and engine the API uses, so
rule logic is never duplicated between the two.

## Roadmap

- Visual rules designer: drag-and-drop canvas with traits as nodes and
  prerequisites as edges
- User accounts and per-project permissions
- Session timeline, so progression and rule gates can be anchored to events
- Relationships between characters (patron/retainer style links)
- Items and crafting
- Character sheet export

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
