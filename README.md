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

## Structure

```
tkg2026/
├── frontend/   Next.js 16 website (pages, components, styles, SEO, server actions)
├── backend/    Node.js + Express + MongoDB (Mongoose) API, email delivery, jobs, scripts
├── docs/       Requirements, status, runbooks
└── deploy/     nginx configs and deploy script
```

The website never talks to MongoDB directly. Its server components and server actions call
the backend over HTTP (`BACKEND_URL`, authenticated with `INTERNAL_API_KEY`). The backend
also serves media (`/api/assets/file/*`), `/api/health` and `/api/cron/deliver`; the website
proxies those paths so their public URLs did not change.

Until October 2026 the backend was Payload CMS embedded in the Next.js app. The MongoDB data
was kept as it was: the backend reads and writes the same collections.

### Admin panel

`/admin` is a WordPress-style panel (frontend `src/admin/` + `src/app/(admin)/`, backend
`src/routes/admin.ts`). Staff log in with their existing Payload accounts (same password
hashes); sessions are a signed httpOnly cookie. Role rules live in
`backend/src/admin/permissions.ts`; the evidence gate and route-acceptance rules are enforced
in the data layer for every writer. Article bodies use a Lexical editor whose nodes read and
write the exact JSON Payload stored, so existing content round-trips unchanged.

## Stack

| | |
|---|---|
| Website | Next.js 16.3 · React 19.2 · TypeScript 5.9 |
| API | Node.js ≥ 20.9 · Express 5 · Mongoose 8 · Nodemailer · TypeScript 5.9 |
| Database | MongoDB |

## Setup

```bash
npm install                 # root: only the dev runner (concurrently)
npm run install:all         # backend + frontend dependencies

cp backend/.env.example backend/.env     # DATABASE_URI, SMTP, INTERNAL_API_KEY, APP_SECRET ...
cp frontend/.env.example frontend/.env   # BACKEND_URL, the same INTERNAL_API_KEY ...

npm --prefix backend run seed:dev        # development seed (dev only)
```

## Running

```bash
npm run dev                              # API on :4000 and website on :3000 together
npm --prefix backend run mail:dev        # local SMTP capture on :1025 -> .mail/*.eml
npm --prefix backend run worker:delivery # durable delivery, SLA sweep, evidence re-check
```

| URL | Purpose |
|---|---|
| `http://localhost:3000` | Public site |
| `http://127.0.0.1:4000/api/health` | API health |
| `backend/.mail/` | Captured emails as `.eml` |

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `typecheck` / `test` | Both apps |
| `npm --prefix frontend run dev` / `build` / `start` / `lint` | Website only |
| `npm --prefix backend run dev` / `build` / `start` | API only |
| `npm --prefix backend test` | Inquiry + newsletter integration tests (local MongoDB test database) |
| `npm --prefix frontend test` | Form UI tests (jsdom) |
| `npm --prefix backend run seed:dev` / `seed:production` | Seeds |
| `npm --prefix backend run worker:delivery` | Delivery + SLA worker (`-- --once` for a single pass) |
| `npm --prefix backend run import:redirects` | Legacy redirect import (dry run; `-- --apply` to write) |
| `npm --prefix backend run set:inquiry-recipient` | Route recipients / acceptance |
| `node frontend/scripts/check-contrast.mjs` | WCAG contrast check; non-zero exit on regression |

## Tests

```bash
npm --prefix backend test      # uses mongodb://127.0.0.1:27017/tel_ganesan_test (TEST_DATABASE_URI overrides)
npm --prefix frontend test
```

Integration tests run against a dedicated database and never touch development data.

## Documentation

| Document | Contents |
|---|---|
| [`RUN_PROJECT.md`](RUN_PROJECT.md) | Quick run guide |
| [`docs/STATUS.md`](docs/STATUS.md) | Current state, how to run it, what is next |
| [`docs/SOURCE_REGISTER.md`](docs/SOURCE_REGISTER.md) | Source hashes, approval status, what is and is not supplied |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Stack, pinned versions, decisions and reasons |
| [`docs/REQUIREMENTS.csv`](docs/REQUIREMENTS.csv) | All 16 FR IDs → implementation path → test ID → status |
| [`docs/OWNERS_AND_ROUTES.md`](docs/OWNERS_AND_ROUTES.md) | Seven routes, SLAs, escalation, acceptance state |
| [`docs/CONTENT_EVIDENCE.md`](docs/CONTENT_EVIDENCE.md) | Blocked claims and assets, and who owns each |
| [`docs/DECISIONS_AND_RISKS.md`](docs/DECISIONS_AND_RISKS.md) | Open G0 decisions, risk register, change requests |
| [`docs/QA_AND_RELEASE.md`](docs/QA_AND_RELEASE.md) | Executed commands and results, test inventory, defects, gate status |

## Safety properties worth knowing

- **Nothing can email a real person from development** when SMTP points at the local capture,
  which writes to disk and never forwards.
- **Drafts are not publicly reachable**: every public read filters on `_status: published`.
- **Publishing is gated**: the backend data layer rejects `_status: published` for content
  that fails the evidence gate, whoever is writing.
- **Indexing is off by default** and `robots.txt` is `Disallow: /` until a production origin
  is configured and indexing is explicitly enabled.
- **A form never reports success unless an owner delivery actually succeeded.**
- **The internal API is not public**: it listens on loopback, is not proxied by the website,
  and requires `INTERNAL_API_KEY`.
