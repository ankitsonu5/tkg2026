# STATUS — Phase 0 complete

**Updated:** 08 September 2026
**Phase:** 0 (Foundation) — complete
**Next:** Phase 1 (Content and UX foundation)

> **Addendum, 09 September 2026:** the database adapter was switched from Postgres to
> MongoDB (`docs/ARCHITECTURE.md` Decision 9) after this snapshot was written. The
> Postgres-specific facts below (74 tables via committed migration, the 43-test run) describe
> that prior state and have **not** been re-verified against MongoDB yet — this file is left
> as the dated record it is rather than silently edited to claim re-verification that hasn't
> happened.

## What actually works right now

A running Next.js 16 + Payload 3.88 application on local PostgreSQL, with real persistence:

- **All 15 baseline page/template types** are routable. 11 return 200; the 4 dynamic detail
  templates correctly 404 for unknown slugs because no records have been published.
- **Payload admin** at `/admin`; login verified; an administrator was bootstrapped with a
  generated password.
- **74 database tables** created by a committed migration, not a silent schema push.
- **The evidence publication gate works and is enforced server-side.** Publishing content
  that cites an unapproved claim, an uncleared asset or an unresolved status is rejected at
  write time with corrective detail — and an administrator cannot bypass it.
- **All seven inquiry routes submit and deliver end to end**, through a durable
  database-backed outbox with bounded retries. 21 messages captured locally.
- **43 integration tests pass** against a real Postgres database.
- Typecheck, lint and production build all clean.

## What is local, simulated or unconfigured

| Area | State |
|---|---|
| Email | Local SMTP capture on `127.0.0.1:1025` writing `.eml` files. **Nothing can reach a real person.** No production provider. |
| Route recipients | `route-owner+<route>@localhost.test`. **No real mailbox, no named owner, no acceptance.** |
| Content | All 15 pages are **drafts** with baseline purpose text. No approved copy. |
| Claims | Six high-risk topics seeded **BLOCKED**. Not facts, not drafts of facts. |
| Assets | **Zero.** No portrait, logo, award or testimonial fabricated. |
| Canonicals / sitemap | **Suppressed** — no verified production origin. |
| Indexing | **Off.** `robots.txt` is `Disallow: /`. |
| Privacy policy | Version literally `draft-unapproved`. Retention unimplemented. |
| Analytics | Taxonomy and consent gate implemented; **no GA4 property**, so nothing is sent. |
| Deployment | **Nothing deployed.** No DNS touched, no live site replaced. |

## Verification evidence

```
npx tsc --noEmit          exit 0
npm run lint              0 errors, 0 warnings
npm run build             compiled; 22 routes
npm run test:int          43 passed (4 files)
node scripts/check-contrast.mjs   all body-text combinations meet WCAG AA
npx tsx scripts/smoke-inquiry.ts  7/7 routes delivered; 21 messages captured
```

Full detail, including the five defects found and fixed, is in `docs/QA_AND_RELEASE.md`.

## How to run it

```bash
# One-time (a local mongod creates the database on first write, nothing to pre-create)
cp .env.example .env         # then set PAYLOAD_SECRET
npm install
npm run db:migrate
npm run seed:dev
npm run bootstrap:admin -- you@example.com "Your Name"   # prints a password ONCE

# Every session — three terminals
npm run mail:dev             # SMTP capture on :1025, writes .mail/*.eml
npm run dev                  # http://localhost:3000
npm run worker:delivery      # durable delivery + SLA sweep
```

Public site `http://localhost:3000` · Admin `http://localhost:3000/admin`

## Immediate next task

**Reconcile `src/baseline/` against the four source documents now located on disk**
(`docs/SOURCE_REGISTER.md`): Copy Deck, Page-by-Page Content Blueprint, Visual Design System,
CTA and Lead-Routing Matrix. The Phase 0 module structure and qualification wording were
derived from the baseline PDF's summary tables; those four documents are more specific and
may disagree. Differences are dated change requests in **either** direction — neither side
silently wins.

Exact next command:

```bash
npm run dev   # then work through /admin against the Copy Deck
```

## Phase 1 task list

1. Reconcile `src/baseline/` with the four content/design source documents (above).
2. Seed `claims`, `evidence-sources` and `assets` from the Asset and Evidence Register
   spreadsheet rather than re-keying by hand.
3. Build out page modules and responsive layouts per the Visual Design System; add the
   remaining module renderers (rich text body, populated card grids).
4. Wire protected draft preview into the frontend (`?preview=1` currently honours published
   only; the CMS live-preview URLs are configured).
5. Reconcile the SEO and Metadata Workbook into the `seo` field group and freeze URL paths.
6. Capture G1/G2 review dependencies without blocking unrelated code work.

## Blocked, needing someone else

| Blocker | Who | Why it blocks |
|---|---|---|
| Named owners + backups + written acceptance for 7 routes | Ankit + functional leads | **R-03.** No route can be accepted; route UAT cannot complete. |
| SLA clock policy (elapsed vs business hours, timezone, holidays) | Route owners | SLA due dates and reminders are not meaningful until decided. |
| Production domain and hosting | Ankit + Technical Lead | Canonicals, sitemap and redirect freeze all depend on it. |
| Live demo audit (07 Sep 2026) + Hostinger URL | Content + Design + Ankit | Keep/Rework/Replace/Retire inventory and the legacy URL inventory cannot start. |
| Evidence for the six blocked claims | Business Owner / Legal / Creative Producer | Those facts cannot be published. |
| Privacy policy, retention periods, contact route | Legal / Privacy | Forms cannot be accepted for production. |
| Rights-cleared imagery | Creative Producer | No asset can be published. |
| Performance budget thresholds | Ankit + Technical Lead | FR-PERF-01 is P0 but has no threshold to test against. |
