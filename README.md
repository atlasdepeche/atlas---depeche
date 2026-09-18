# Atlas Depeche

Moroccan agentic newsroom — Arabic (Fusha) + French. **Phase 0** (bootstrap)
and **Phase 1** (ingest/radar, SHADOW) code is in; no agents, no CMS,
nothing published, nothing deployed yet.

Full spec: [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md).
Project rules / current state: [`CLAUDE.md`](CLAUDE.md).

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL to use anything DB-backed
npm run dev             # http://localhost:3000, health check at /api/health
```

## Radar (Phase 1)

Try the ingest pipeline against real, live sources without any database:

```bash
npm run radar:dry-run
```

To actually persist (needs `DATABASE_URL` pointed at a real Postgres):

```bash
npm run db:generate   # schema.ts -> SQL migration file in drizzle/
npm run db:migrate    # apply migrations
npm run db:seed       # load src/db/seed-sources.ts into the `sources` table
npm run radar:once    # one fetch+dedup pass, writes source_items/events
```

Then `/admin/events` (dev-only, unauthenticated) lists what the radar found.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
