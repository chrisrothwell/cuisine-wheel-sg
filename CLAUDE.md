# Cuisine Wheel SG

A gamified restaurant discovery platform for Singapore, organized by country/cuisine. Users spin an interactive wheel to randomly select a cuisine, then browse, track visits, and review restaurants. Social features include groups and shared visit tracking.

Live: https://cuisine-wheel-sg.rothwell-chris.workers.dev/

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev-hono` | Dev server (Cloudflare Workers via Wrangler) — builds first |
| `pnpm run dev-win-express` | Dev server (Express, Windows-compatible) |
| `pnpm run build` | Full build: Vite (client) + esbuild (worker) |
| `pnpm run build:worker` | Build worker only |
| `pnpm run check` | TypeScript type checking (no emit) |
| `pnpm run test` | Run tests (vitest) |
| `pnpm run format` | Format all files (prettier) |
| `pnpm run db:push` | Generate + run Drizzle migrations |
| `npx wrangler deploy` | Deploy to Cloudflare Workers |

Package manager: **pnpm** (v10.4.1)

## Architecture

```
client/          React 19 SPA (Vite, Tailwind, Shadcn UI)
server/          Backend (dual runtime)
  worker.ts        Cloudflare Workers entry (Hono)
  _core/index.ts   Express entry (local dev)
  _core/trpc.ts    tRPC init, middleware, procedure types
  _core/oauth.ts   Google OAuth flow
  _core/sdk.ts     JWT session management (jose)
  routers.ts       All tRPC procedure definitions
  db.ts            Database query helpers
shared/          Shared types and constants
drizzle/         Schema and migrations
  schema.ts        7 tables: users, countries, restaurants, visits,
                   visitParticipants, reviews, groups, groupMembers
```

### Tech Stack

- **Frontend**: React 19 + TypeScript, Vite, Wouter (routing), TanStack React Query, Framer Motion
- **Backend**: tRPC 11 over Hono (prod) / Express (dev)
- **Database**: Turso (LibSQL/SQLite) via Drizzle ORM
- **Auth**: Google OAuth -> JWT in HTTP-only cookies
- **Deployment**: Cloudflare Workers
- **Storage**: AWS S3 (images)
- **Maps**: Google Maps + React Simple Maps

### Key Design Decisions

- **Dual runtime**: Hono serves production on Cloudflare Workers; Express is used for local development. Environment variables are abstracted through `server/_core/env.ts`.
- **tRPC procedures** use three auth levels: `publicProcedure`, `protectedProcedure` (logged-in user), and `adminProcedure`.
- **Country data** comes from a static `countries.json` file, loaded into the DB. Country IDs in the DB may differ from JSON array indices — always use DB IDs for foreign keys.
- **Client path aliases**: `@/*` maps to `client/src/*`, `@shared/*` maps to `shared/*`.

## Code Style

- Prettier: double quotes, semicolons, trailing commas (es5), 2-space indent, 80-char width
- Arrow parens: avoid when possible (`x => x` not `(x) => x`)
- LF line endings
- TypeScript strict mode

## Database

SQLite via Turso. Schema in `drizzle/schema.ts`.

Tables: `users`, `countries`, `restaurants`, `visits`, `visit_participants`, `reviews`, `groups`, `group_members`

Column naming: snake_case in DB, camelCase in Drizzle schema properties.

## Testing

Vitest with Node environment. Tests in `server/` directory.

- Tests use `appRouter.createCaller()` with a `createTestContext()` helper
- Run: `pnpm run test`

## Deployment

1. `pnpm run build` (Vite client + esbuild worker)
2. `npx wrangler deploy`

Secrets are set via `npx wrangler secret put <KEY>`. Config in `wrangler.toml`.

## Cloudflare Workers Gotchas

- **Assets binding**: `wrangler.toml` must have `binding = "ASSETS"` under `[assets]` so the worker can serve `index.html` for SPA routes. Without it, `c.env.ASSETS` is undefined and the SPA catch-all fails.
- **SPA routing**: The catch-all in `worker.ts` serves `index.html` via `c.env.ASSETS.fetch()` for any non-API path. This is required for client-side routing (Wouter) to work on direct navigation/refresh.
- **Secrets**: All env vars used by the worker must be set via `npx wrangler secret put <KEY>`. Currently set: `DATABASE_AUTH_TOKEN`, `GOOGLE_PLACE_API_KEY`, `JWT_SECRET`, `OAUTH_CLIENT_SECRET`, `VITE_OAUTH_CLIENT_ID`. Vars in `wrangler.toml`: `NODE_ENV`.
- **Cookie settings**: Use `SameSite=Lax` for same-site OAuth flow. `SameSite=None` is unnecessary and can cause issues with third-party cookie blocking.
- **OpenID format**: Worker OAuth uses `google_${googleUser.id}` as `openId`, while Express OAuth uses `userInfo.sub` directly. These are different — users created in one environment won't resolve in the other.

## Known Issues / Gotchas

- Country ID mismatch: JSON array indices don't match DB auto-increment IDs. Always resolve via DB lookup, not array index.
- Windows dev: Use `dev-win-express` (uses cross-env) instead of `dev-express`.
- The `nul` file in repo root is a Windows artifact — safe to delete.
- Pre-existing TS errors in `llm.ts`, `voiceTranscription.ts`, `storage.ts` — these reference `ENV.forgeApiUrl`/`ENV.forgeApiKey` which don't exist (Manus platform leftovers).
- Pre-existing test failures: auth logout test expects wrong cookie options, countries tests expect removed properties (`cuisineType`, `flagEmoji`), groups tests need a DB connection.
- `sdk.ts` contains Manus-specific OAuth code (`OAuthService`, `getUserInfoWithJwt`) that is unused with Google OAuth but retained for compatibility.
