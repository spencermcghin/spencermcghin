# CLAUDE.md — LARP Character Manager

This file provides guidance for AI assistants (Claude Code, etc.) working on this repository.

---

## Project Overview

**LARP Character Manager** is a full-stack web application for managing Live Action Roleplaying (LARP) characters. Users can create, view, edit, and delete characters with RPG-style attributes (STR/DEX/CON/INT/WIS/CHA), skills, inventory, backgrounds, and notes.

> **Note:** The `character-manager/` directory was deleted in the most recent commit (`26d0d7b`). The full codebase is recoverable from git history (commit `9b354b8`). Any new development should restore this directory or start fresh following the conventions documented here.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, TypeScript, Vite 6        |
| Routing   | React Router DOM v7                 |
| HTTP (FE) | Axios                               |
| Backend   | Node.js, Express 5, TypeScript      |
| Storage   | In-memory (array, no database yet)  |
| Linting   | ESLint (flat config) + TS ESLint    |
| Build     | tsc (backend), Vite (frontend)      |

---

## Repository Structure

```
character-manager/
├── package.json                  # Root scripts: install:all, dev:*, build:*
├── README.md
├── backend/
│   ├── .env.example              # PORT=3000, NODE_ENV=development
│   ├── package.json
│   ├── tsconfig.json             # target: ES2020, module: commonjs, outDir: dist/
│   └── src/
│       ├── index.ts              # Express app entry point (port 3000)
│       ├── controllers/
│       │   └── characterController.ts   # CRUD handlers (in-memory array)
│       ├── models/
│       │   └── Character.ts      # Character + CreateCharacterDTO interfaces
│       └── routes/
│           └── characters.ts     # Route definitions → controller methods
└── frontend/
    ├── .env.example              # VITE_API_URL=http://localhost:3000/api
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── eslint.config.js          # Flat ESLint config with React Hooks plugin
    └── src/
        ├── App.tsx               # Router + NavBar + routes
        ├── App.css               # Full responsive stylesheet
        ├── main.tsx
        ├── pages/
        │   ├── Home.tsx
        │   ├── CharacterList.tsx
        │   ├── CharacterDetail.tsx
        │   └── CharacterForm.tsx  # Handles both create and edit
        ├── services/
        │   └── api.ts            # Axios client (VITE_API_URL)
        └── types/
            └── Character.ts      # Shared Character type definitions
```

---

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm

### Install dependencies
```bash
cd character-manager
npm run install:all
# Equivalent to: cd backend && npm install && cd ../frontend && npm install
```

### Configure environment
```bash
# Backend
cp character-manager/backend/.env.example character-manager/backend/.env

# Frontend
cp character-manager/frontend/.env.example character-manager/frontend/.env
```

### Run development servers
```bash
# From character-manager/
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
```

### Build for production
```bash
npm run build:all
# Backend: tsc → dist/
# Frontend: tsc -b && vite build
```

---

## API Endpoints

All endpoints are prefixed with `/api`.

| Method | Path                  | Description         |
|--------|-----------------------|---------------------|
| GET    | `/api`                | Health check        |
| GET    | `/api/characters`     | List all characters |
| GET    | `/api/characters/:id` | Get one character   |
| POST   | `/api/characters`     | Create character    |
| PUT    | `/api/characters/:id` | Update character    |
| DELETE | `/api/characters/:id` | Delete character    |

---

## Data Model

```typescript
interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills: string[];
  inventory: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
```

`CreateCharacterDTO` omits `id`, `createdAt`, and `updatedAt`.

---

## Key Conventions

### TypeScript
- **Strict mode** is enabled in all `tsconfig.json` files — no `any` without justification.
- Backend uses **CommonJS** (`module: commonjs`), frontend uses **ESM** (`type: "module"`).
- Shared types live in `frontend/src/types/` (backend has its own `models/` interfaces).

### Frontend
- State managed with **React hooks** (no Redux, no Zustand).
- Form state is managed manually in `CharacterForm.tsx` — keep it simple.
- API calls go through `src/services/api.ts` exclusively — never call axios directly in components.
- Use `VITE_API_URL` env var for backend base URL; never hardcode `localhost`.
- Routing uses React Router v7 `BrowserRouter` with path-based routes.

### Backend
- Controller logic lives in `controllers/`, routing in `routes/` — keep them separate.
- CORS is enabled globally for development; restrict in production.
- All responses use standard Express `req`/`res` — no custom response wrappers.
- Character `id` uses `Date.now().toString()` currently — replace with UUID when adding a database.

### Styling
- Single `App.css` file — no CSS modules, no Tailwind.
- Dark nav bar (`#2c3e50`), card-based character grid, responsive mobile breakpoints.
- Button variants: default (primary), `.btn-danger`, `.btn-small`.

### Git
- Commit messages are imperative sentences (e.g., "Fix CSS conflicts preventing app from displaying").
- Feature branches follow the pattern `claude/<slug>`.

---

## Current Limitations & Planned Improvements

- **No database:** Data is stored in an in-memory array and resets on server restart. Replace with a real database (e.g., PostgreSQL + Prisma or MongoDB + Mongoose).
- **No authentication:** All CRUD operations are unauthenticated.
- **No tests:** Neither backend nor frontend has a test suite. Add Jest + Supertest (backend) and Vitest + React Testing Library (frontend).
- **No CI/CD:** No GitHub Actions or deployment pipeline configured.
- **No Docker:** No containerization — add Dockerfile + docker-compose for consistent environments.
- **No input validation:** Backend accepts any payload; add Zod or express-validator.

---

## Development Workflow

1. **Restore the project** from git history or recreate `character-manager/` following the structure above.
2. Install dependencies with `npm run install:all`.
3. Copy `.env.example` → `.env` in both `backend/` and `frontend/`.
4. Start both dev servers.
5. Run `npm run lint` (frontend) to check for linting issues before committing.
6. Run `npm run build:all` to verify production builds succeed.
7. No automated tests exist yet — manually test CRUD flows in the browser.

---

## Scripts Reference

### Root (`character-manager/package.json`)
| Script              | Command                                        |
|---------------------|------------------------------------------------|
| `install:all`       | `cd backend && npm install && cd ../frontend && npm install` |
| `dev:backend`       | `cd backend && npm run dev`                    |
| `dev:frontend`      | `cd frontend && npm run dev`                   |
| `build:backend`     | `cd backend && npm run build`                  |
| `build:frontend`    | `cd frontend && npm run build`                 |
| `build:all`         | `npm run build:backend && npm run build:frontend` |

### Backend (`character-manager/backend/package.json`)
| Script  | Command                         |
|---------|---------------------------------|
| `dev`   | `nodemon --exec ts-node src/index.ts` |
| `build` | `tsc`                           |
| `start` | `node dist/index.js`            |

### Frontend (`character-manager/frontend/package.json`)
| Script    | Command              |
|-----------|----------------------|
| `dev`     | `vite`               |
| `build`   | `tsc -b && vite build` |
| `lint`    | `eslint .`           |
| `preview` | `vite preview`       |
