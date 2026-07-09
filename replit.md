# Gerenciador de Guichê

Sistema de gerenciamento de guichês para prefeitura municipal. Permite que a recepção visualize mesas livres por setor em tempo real, e que cada mesa libere/ocupe seu guichê com um botão.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/guiche run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/guiche)
- API: Express 5 + WebSocket (ws) for real-time desk updates
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Auth: pgcrypto bcrypt password hashing, in-memory token store

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/desks.ts` — desks table (id, desk_number, name, sector, status)
- `lib/db/src/schema/users.ts` — users table (username, password_hash, role, desk_id, etc.)
- `artifacts/api-server/src/routes/auth.ts` — login + /auth/me
- `artifacts/api-server/src/routes/desks.ts` — GET /desks, GET /desks/summary, POST /desks/:id/free, POST /desks/:id/occupy
- `artifacts/api-server/src/lib/auth.ts` — token store + DB credential verification via pgcrypto
- `artifacts/api-server/src/lib/wsManager.ts` — WebSocket broadcast on desk status changes
- `artifacts/guiche/src/` — React frontend (login, reception view, desk view)

## Architecture decisions

- Passwords hashed in PostgreSQL using pgcrypto crypt() + blowfish (bf) salt; verification done in DB with crypt(input, hash) comparison.
- In-memory token store (map of token → user) — sufficient for an internal same-machine deployment; tokens don't expire in this version.
- WebSocket server runs on the same HTTP server at path `/api/ws`; broadcasts `desk_updated` and `desks_reset` events to all connected clients.
- Desk assignments are fixed: desks 1–4 = Protocolo, desks 5–7 = Dívida Ativa; defined in DB seed data.
- Users are seeded via pgcrypto INSERT on first deploy; conflict behavior is DO UPDATE so re-seeding is safe.

## Product

- **Login**: Users log in with username + password. Recepcao sees all desks; each mesa sees only their own desk.
- **Recepção view** (`/recepcao`): Split into Protocolo (desks 1–4) and Dívida Ativa (desks 5–7). Green = free, red = occupied. Real-time via WebSocket.
- **Mesa view** (`/mesa/:id`): Shows current desk status with Liberar / Ocupar buttons. Real-time updates.

## User accounts

| Username  | Password  | Role     | Sector       |
|-----------|-----------|----------|--------------|
| recepcao  | recepcao  | recepcao | —            |
| mesa1     | mesa1     | mesa     | Protocolo    |
| mesa2     | mesa2     | mesa     | Protocolo    |
| mesa3     | mesa3     | mesa     | Protocolo    |
| mesa4     | mesa4     | mesa     | Protocolo    |
| mesa5     | mesa5     | mesa     | Dívida Ativa |
| mesa6     | mesa6     | mesa     | Dívida Ativa |
| mesa7     | mesa7     | mesa     | Dívida Ativa |

## User preferences

- Language: Portuguese (pt-BR)
- Requested Docker support — Dockerfiles can be generated for local deployment

## Gotchas

- After schema changes in `lib/db/src/schema/`, run `pnpm run typecheck:libs` BEFORE checking artifact packages.
- WebSocket path is `/api/ws` — it shares the `/api` proxy path, no extra toml entry needed.
- pgcrypto must be enabled in PostgreSQL (`CREATE EXTENSION IF NOT EXISTS pgcrypto`) — done in seed script.
- Raw SQL in auth.ts uses string interpolation with manual single-quote escaping; this is safe only because inputs are validated by LoginBody Zod schema first (both username and password are string type).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
