# Atlas Depeche

Moroccan agentic newsroom — Arabic (Fusha) + French. Currently in **Phase 0
(bootstrap)**: no ingest, no agents, no CMS, nothing deployed yet.

Full spec: [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md).
Project rules / current state: [`CLAUDE.md`](CLAUDE.md).

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npm run dev             # http://localhost:3000, health check at /api/health
```

Database (only needed for `db:migrate` / `db:push` — schema generation works
without it):

```bash
npm run db:generate   # schema.ts -> SQL migration file in drizzle/
npm run db:migrate    # apply migrations (needs DATABASE_URL)
```

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
