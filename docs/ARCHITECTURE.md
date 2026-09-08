# Architecture Decisions

Phase 0. Every version below was resolved from the npm registry at build time and is pinned
in `package-lock.json`, not chosen from memory.

## Selected stack

| Component | Version | Why this version |
|---|---|---|
| Node.js | 26.0.0 (local) | Satisfies both engine ranges below. Declared support is `^18.20.2 \|\| >=20.9.0`. |
| Next.js | 16.3.0 (exact) | See compatibility note below. |
| React / React DOM | 19.2.6 (exact) | Required by `@payloadcms/richtext-lexical` (`^19.0.1 \|\| ^19.1.2 \|\| ^19.2.1`). |
| Payload CMS | 3.88.0 (exact) | Current stable. All `@payloadcms/*` packages peer-depend on the exact same version. |
| `@payloadcms/db-postgres` | 3.88.0 | Payload's supported Postgres adapter (Drizzle-based). |
| `@payloadcms/richtext-lexical` | 3.88.0 | Editor. |
| `@payloadcms/email-nodemailer` | 3.88.0 | Transport adapter; points at local capture in development. |
| PostgreSQL | 16.14 (local, Homebrew) | Already present on the machine; no container needed. |
| TypeScript | 5.7.3 | Matches the Payload template's tested pin. |
| Vitest | 4.0.18 | Integration tests against a real database. |

### Compatibility note — this combination was verified, not assumed

`next@latest` at build time was **16.3.4**, and `@payloadcms/next@3.88.0` declares a peer
range of `>=16.2.6 <17.0.0`, so 16.3.4 would have satisfied the constraint. We pinned
**16.3.0** instead, because that is the exact version the official Payload 3.88.0 blank
template pins — a combination the vendor has actually tested together. Independently
combining two "latest" versions is precisely the failure mode the handoff warns against.

Source of the scaffold: the `templates/blank` directory of the `payloadcms/payload`
repository at tag `v3.88.0`, downloaded directly. `create-payload-app` could not be used
because it requires a TTY and this environment is non-interactive.

## Deployment assumptions — and what is NOT decided

- **Production host: undecided.** Nothing here assumes Vercel, Hostinger or any other
  platform. The app is a standard Next.js Node server plus Postgres, deployable to any of
  them. `FR-PERF-01` budgets and the rollback procedure both depend on this choice.
- **Production domain: undecided** (Appendix C). This has a concrete consequence in code:
  `src/lib/seo/metadata.ts` emits **no canonical at all** until `productionOrigin` is set in
  site settings, and `src/app/sitemap.ts` returns empty. A guessed origin would bake a wrong
  absolute URL into every page and every sitemap entry.
- **Media storage:** local disk (`media/`) in development. Production needs an
  object-storage adapter; `next.config.ts` already scopes `images.localPatterns` to
  `/api/assets/file/**`.
- **Email provider: not configured.** Development uses a local SMTP capture (below).
  Production requires a real provider with TLS and credentials.

## Decisions taken, with reasons

### 1. Docker was unavailable; local capture replaces the container
The handoff proposes Docker Compose for Postgres and mail capture. Docker is **not installed**
on this machine (`docker` binary absent, no Colima). Rather than fake it:
- Postgres: the existing local Homebrew PostgreSQL 16.14 on `127.0.0.1:5432` is used.
- Mail: `scripts/dev-mail-server.ts` is a dependency-free SMTP sink on `127.0.0.1:1025`. It
  writes each message to `.mail/*.eml` and **never forwards anywhere**, so no message can
  reach a real person during development.

A `docker-compose.yml` can be added later without changing application code — both are
addressed purely through `DATABASE_URI` and `SMTP_*`.

### 2. The publication gate is a write-time hook, not a UI check
`src/lib/evidence/hooks.ts` attaches `enforcePublicationGate` as a `beforeChange` hook to
every publishable collection. It therefore applies to the admin UI, REST, GraphQL and Local
API calls alike, and it does not inspect the caller's role — so an administrator cannot
bypass it by ordinary editing (proved by `QA-GATE-03`).

### 3. Privileged-field changes are rejected loudly, not silently stripped
**Discovered during Phase 0 testing:** Payload's field-level `access` silently *removes* a
field the user may not write; the request then succeeds and the field is simply unchanged. For
evidence approval that is dangerous — an editor would see a successful save and reasonably
believe a claim is now Ready.

`src/access/guard.ts` therefore adds `beforeOperation` guards that reject such attempts with a
403 naming the accountable role. It must be `beforeOperation`: by the time `beforeValidate`
runs, the unauthorized fields have already been stripped (verified empirically — the hook
received an empty object). Field-level access remains underneath as defence in depth.
Covered by `QA-AUTH-03` and `QA-AUTH-05`.

### 4. Delivery is a durable outbox, not a background promise
`delivery-attempts` rows are committed with the lead. `src/jobs/deliver-inquiries.ts` claims
due rows, sends, and applies bounded exponential backoff (30s → 480s, 5 attempts). A
request-lifetime promise would lose the lead on a crash or a serverless freeze.

The delivery contract is explicit, because the visitor-facing message depends on it:
`stored` → `pending` → `delivered` | `failed`. **Only an owner delivery marks a lead
delivered** — a successful sender acknowledgement does not (`QA-ROUTE-08`).

### 5. Rate limiting is database-backed
`rate-limit-buckets` in Postgres, keyed by a salted SHA-256 of the client IP (the raw address
is never stored). An in-memory counter would reset on every cold start and be useless across
multiple instances.

### 6. Indexation is off by default, in code
`site-settings.allowIndexing` defaults to `false`, and `robots.ts` returns `Disallow: /`
unless indexing is enabled **and** a production origin is set. Staging is private without
anyone having to remember to make it so. Search results are `noindex` unconditionally.

### 7. SLA clock is configurable because the policy is undecided
The baseline gives hours (4/24/48/72) but never says elapsed vs business hours, nor the
calendar. Both are implemented (`src/lib/inquiries/sla.ts`) and selected per route by
`slaClock`. Business-hours mode is Mon–Fri 09:00–17:00 and **does not yet handle public
holidays** — that calendar is an open dependency.

### 8. Gold is an accent, never light-surface text
`node scripts/check-contrast.mjs` computes every declared palette combination. Gold on ivory
is **2.14:1 — a fail** — so gold is restricted to dark surfaces (7.46:1 on navy) and to rules
and marks. `--color-link` is a darkened blue (7.33:1 on white) rather than the baseline's
supporting blue. The script exits non-zero if any combination declared for body text drops
below AA.

## Directory layout

```
src/baseline/       Baseline constants: 15 pages, 7 routes, FR/gate IDs. Single source of truth.
src/access/         Role model, access functions, privileged-field guards.
src/collections/    16 Payload collections.
src/globals/        navigation, footer, site-settings.
src/blocks/         Approved modular content blocks, each carrying its MOD ID.
src/lib/evidence/   Publication gate, its hook, and the post-publication re-check sweep.
src/lib/inquiries/  Validation, rate limiting, SLA, attribution, the single submit path.
src/lib/analytics/  Event taxonomy and the consent-aware, provider-independent adapter.
src/lib/seo/        Metadata builder (canonical/indexation policy).
src/jobs/           Durable delivery worker and SLA sweep.
src/app/(frontend)/ 15 public page/template routes, 404 and error boundary.
src/app/(payload)/  Payload admin and API (generated by the template).
migrations/         Committed SQL migrations. Schema is never silently pushed in production.
scripts/            Bootstrap, seed, worker, mail capture, contrast check, route smoke test.
tests/int/          43 integration tests against a real Postgres database.
```
