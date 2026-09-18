# Atlas Depeche

Moroccan agentic newsroom — Arabic (Fusha) + French. **Phase 0** (bootstrap),
**Phase 1** (ingest/radar, SHADOW), **Phase 2** (verify + knowledge), and
**Phase 3** (write + CMS, ASSISTED mode) code is in; no public site yet,
nothing published, nothing deployed.

Full spec: [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md).
Project rules / current state: [`CLAUDE.md`](CLAUDE.md).

## Running locally

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / ANTHROPIC_API_KEY to use those parts
npm run dev             # http://localhost:3000, health check at /api/health
```

## Radar (Phase 1)

Try the ingest pipeline against real, live sources without any database:

```bash
npm run radar:dry-run
```

## Verify (Phase 2)

Try the Verification + Adversarial agents against a real, live source
sample, with no database (needs `ANTHROPIC_API_KEY`):

```bash
npm run verify:dry-run
```

## Write (Phase 3)

Try the Arabic + French Writer Agent — chains a real verify pass into real
ar/fr drafts, no database (needs `ANTHROPIC_API_KEY`):

```bash
npm run write:dry-run
```

## Persisting for real

Needs `DATABASE_URL` pointed at a real Postgres (and `ANTHROPIC_API_KEY`
for the verify/write steps):

```bash
npm run db:generate   # schema.ts -> SQL migration file in drizzle/
npm run db:migrate    # apply migrations
npm run db:seed       # load seed-sources.ts + seed-gazetteer.ts
npm run radar:once    # one fetch+dedup pass, writes source_items/events
npm run verify:once   # verify candidate events, writes claims/evidence
npm run write:once    # write matching ar+fr drafts for verified events
```

Then `/admin/events` (dev-only, unauthenticated) shows what the radar found
and, once verified, each event's claims and verdict; `/admin/articles`
shows matching ar/fr drafts side by side with an "Approve both" action
(ASSISTED mode — approving still does not publish anything).

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
