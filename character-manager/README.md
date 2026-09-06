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
- **4 Visual Themes**: Gothic (default), Clean, Parchment, Forest

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
│   └── rulesets/       # demo.ts (seeded), eldritch.ts (acceptance fixture)
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

New accounts are seeded with a private copy of the **Demo Rules Set**, so the
app opens on a worked example rather than an empty list. It is deliberately a
generic set rather than a real published game: a new user needs to learn the
tool, and a real game's rules teach them the game instead. Every editor
feature appears in it at least once, and each entry explains what it
demonstrates.

If your account predates it, or you deleted it, the Projects page offers to
add a fresh copy.

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

## Roles

Two levels, because a LARP has two kinds of authority: who runs the app, and
who runs a game.

| | App admin | Project admin | Member |
|---|---|---|---|
| Manage accounts, open any project | ✓ | | |
| Edit the ruleset, delete the project | ✓ | ✓ | |
| Invite and remove members, set roles | ✓ | ✓ | |
| Open any character sheet in the project | ✓ | ✓ | |
| Create and edit **own** characters | ✓ | ✓ | ✓ |
| See the roster (names, archetypes, players) | ✓ | ✓ | ✓ |

**The first account to register becomes the app admin**, so a fresh deploy has
an administrator without anyone editing the database. Whoever creates a project
administers it.

**Members see a roster, not sheets.** Everyone in a project can see who is
playing and roughly what they play; full builds are visible only to the
character's own player and to project staff. The reduction happens server-side,
so a build is never sent to a client that should not have it.

**Project admins can edit any character in their project.** Staff routinely
need to award points or correct a build, and refusing that would push the work
into a database console. Editing never transfers ownership -- the character
stays with its player.

**Joining is by invite link.** A project admin mints a link, shares it, and
anyone with an account who follows it joins as a member. Links expire after 30
days and can be revoked. As with sessions, the link carries a random token and
the database stores only its hash, so the raw link is shown once at creation
and is not recoverable afterwards.

A project always keeps at least one admin, and the last app administrator
cannot be demoted -- either would leave the system unmanageable with no route
back short of a database edit.

```
GET    /api/rulesets/:id/members              list members
PATCH  /api/rulesets/:id/members/:userId      set a member's role
DELETE /api/rulesets/:id/members/:userId      remove a member
GET    /api/rulesets/:id/invites              list live invites
POST   /api/rulesets/:id/invites              mint a link
DELETE /api/rulesets/:id/invites/:inviteId    revoke a link
GET    /api/invites/:token                    preview before joining
POST   /api/invites/:token/accept             join
GET    /api/admin/users                       app admins only
PATCH  /api/admin/users/:id                   set an account's app role
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
created on boot. Rulesets are seeded per account on registration, not into
the database as a whole.

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

- **Gothic** - Dark, gold-accented, with a blackletter display face (default)
- **Clean** - Contemporary and high-contrast
- **Parchment** - Aged paper
- **Forest** - Muted greens

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

### Render, and other split deploys

Removed. The API can serve the frontend, so there is no reason to run them on
separate origins -- doing so needs `CORS_ORIGIN` on the API, forces the session
cookie to `SameSite=None` (giving up the CSRF protection `lax` provides), and
turns a build-time `VITE_API_URL` into a way to point a working deployment at a
dead one.

If you do split them, set `CORS_ORIGIN` on the API to the frontend's origin and
`VITE_API_URL` on the frontend to the API's. `GET /api` reports which mode it is
in, so a misconfiguration is one request away from being obvious.

### Seeding a demo account

To get something to look at without clicking through setup:

```bash
DATABASE_URL=postgres://... npm run seed:demo
```

It creates an account with a populated project -- four characters in different
states, including one deliberately illegal so the rules check has something to
report. The password is generated and printed once; set `DEMO_PASSWORD` and
`DEMO_EMAIL` to choose your own. It refuses to run if that address already
exists, and never runs on boot: seeding a known account automatically would put
predictable credentials on every deployment.

You do not strictly need it. The **first account to register becomes the app
admin**, so signing up on a fresh install gets you in with a copy of the Demo
Rules Set already in your space.

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

## Decisions

**Rules are authored in an outline, not on a canvas.** A drag-and-drop graph
was the obvious design and it was built and then removed. Measured against a
real published ruleset, of 544 prerequisite clauses only 68 name a different
skill; 292 are rank gates and 184 are tier ladders. Neither of those is an
edge between two skills, so a canvas would have drawn about an eighth of the
rules and hidden the rest. The editor groups skills by tree, by track
position or by tag instead, and every grouping is derived from what the
skills already require rather than maintained alongside them.

## Roadmap

- Session timeline, so progression and rule gates can be anchored to events
- Relationships between characters (patron/retainer style links)
- Items and crafting
- Character sheet export

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
