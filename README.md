# Tel K. Ganesan — Executive Platform

An evidence-based executive authority and relationship platform, implementing the
**Master Business Requirements & Implementation Baseline v1.0 (07 September 2026)**.

> **Status: Phase 0 (Foundation) complete. Not production-ready, not deployed.**
> Read [`docs/STATUS.md`](docs/STATUS.md) for exactly what works and what is still local,
> simulated or unconfigured.

## What this is

Not a brochure and not a venture directory. The organising idea is that **a factual claim
cannot reach a public page unless its evidence has been verified** — and that rule is
enforced by the application at write time, not by editorial convention.

- 15 public page/template types on the approved information architecture
- Seven qualified inquiry routes with owner roles, SLAs and controlled escalation
- A server-enforced publication gate covering claims, rights, accessibility metadata and
  unresolved role/entity status
- Consent-aware analytics and attribution that record refusal honestly rather than inventing
  a source

## Stack

Next.js 16.3.0 · React 19.2.6 · Payload CMS 3.88.0 · MongoDB · TypeScript 5.7

Versions were resolved from the registry at build time and pinned; the combination matches
the official Payload 3.88.0 template rather than independently combining "latest" packages.
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Requirements

- Node.js `^18.20.2 || >=20.9.0` (developed on 26.0.0)
- MongoDB reachable locally
- No Docker required

## Setup

```bash
# A local `mongod` creates the database automatically on first write — nothing to pre-create.

cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # -> PAYLOAD_SECRET

npm install
npm run db:migrate
npm run seed:dev
npm run bootstrap:admin -- you@example.com "Your Name"
```

`bootstrap:admin` generates a random password and prints it **once**. It is never written to
a file or committed, and the script refuses to run with `NODE_ENV=production`. `seed:dev`
refuses to run unless `NODE_ENV=development`.

## Running

Three terminals:

```bash
npm run mail:dev          # local SMTP capture on :1025 -> .mail/*.eml, never forwarded
npm run dev               # http://localhost:3000
npm run worker:delivery   # durable delivery, SLA sweep, evidence re-check
```

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Public site |
| `http://localhost:3000/admin` | Payload admin |
| `.mail/` | Captured emails as `.eml` |

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js lifecycle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:int` | 53 integration/UI tests against isolated MongoDB + jsdom |
| `npm run db:migrate` / `:create` / `:status` | Migrations |
| `npm run seed:dev` | Development seed (dev only) |
| `npm run bootstrap:admin` | First administrator (non-production only) |
| `npm run worker:delivery` | Delivery + SLA worker (`-- --once` for a single pass) |
| `npm run mail:dev` | Local SMTP capture |
| `npm run test:forms:e2e` | Traceable seven-route + newsletter delivery proof (requires `mail:dev`) |
| `node scripts/check-contrast.mjs` | WCAG contrast check; non-zero exit on regression |
| `npx tsx scripts/smoke-inquiry.ts` | Traceable end-to-end test across all seven routes |

## Tests

```bash
DATABASE_URI=mongodb://127.0.0.1:27017/tel_ganesan_test npm run test:int
```

Integration tests run against a dedicated database and never touch development data.

## Documentation

| Document | Contents |
|---|---|
| [`docs/STATUS.md`](docs/STATUS.md) | Current state, how to run it, what is next |
| [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md) | Source hashes, approval status, what is and is not supplied |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, pinned versions, decisions and reasons |
| [`docs/REQUIREMENTS.csv`](docs/REQUIREMENTS.csv) | All 16 FR IDs → implementation path → test ID → status |
| [`docs/OWNERS_AND_ROUTES.md`](docs/OWNERS_AND_ROUTES.md) | Seven routes, SLAs, escalation, acceptance state |
| [`docs/CONTENT_EVIDENCE.md`](docs/CONTENT_EVIDENCE.md) | Blocked claims and assets, and who owns each |
| [`docs/DECISIONS_AND_RISKS.md`](docs/DECISIONS_AND_RISKS.md) | Open G0 decisions, risk register, change requests |
| [`docs/QA_AND_RELEASE.md`](docs/QA_AND_RELEASE.md) | Executed commands and results, test inventory, defects, gate status |

## Safety properties worth knowing

- **Nothing can email a real person from development.** The capture writes to disk and never
  forwards.
- **Drafts are not publicly reachable**, including via `?draft=true`.
- **An administrator cannot publish unverified material** by ordinary editing.
- **Indexing is off by default** and `robots.txt` is `Disallow: /` until a production origin
  is configured and indexing is explicitly enabled.
- **A form never reports success unless an owner delivery actually succeeded.**
