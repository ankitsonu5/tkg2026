# QA and Release

## Commands actually executed, with results

Every result below was produced by running the command on 08 September 2026. Nothing is
projected.

| Command | Result |
|---|---|
| `npm install` | **PASS** — 742 packages, exit 0, `package-lock.json` committed |
| `npx tsc --noEmit` | **PASS** — exit 0, no errors |
| `npm run lint` | **PASS** — 0 errors, 0 warnings |
| `npm run build` | **PASS** — compiled; TypeScript checked; 22 routes emitted |
| `npm run db:migrate:create -- initial` | **PASS** — migration generated |
| `npm run db:migrate` | **PASS** — applied; 74 tables in `tel_ganesan_dev` |
| `npm run seed:dev` | **PASS** — 15 draft pages, 7 routes, 6 blocked claims, 3 globals |
| `NODE_ENV=production npm run seed:dev` | **PASS (refused as designed)** — "Refusing to seed: NODE_ENV is production" |
| `npm run bootstrap:admin` | **PASS** — administrator created with a generated password, printed once |
| `npm run test:int` | **PASS — 43/43 tests, 4 files** |
| `node scripts/check-contrast.mjs` | **PASS** — all body-text combinations meet WCAG AA |
| `npx tsx scripts/smoke-inquiry.ts` | **PASS** — 7/7 routes delivered; 21 messages captured |
| `npm run dev` + route checks | **PASS** — all 15 public page/template types respond |

## Test inventory (43 tests)

### Publication gate — `tests/int/evidence-gate.int.spec.ts` (7)
| ID | Assertion | Result |
|---|---|---|
| QA-GATE-01 | Publishing content citing an unapproved claim is blocked | PASS |
| QA-GATE-02 | The rejection names specific corrective conditions, not just "failed" | PASS |
| QA-GATE-03 | **An administrator cannot bypass the gate by ordinary editing** | PASS |
| QA-GATE-04 | Content publishes when every claim is Ready, worded and sourced | PASS |
| QA-GATE-05 | An unresolved entity relationship status blocks publication | PASS |
| QA-GATE-06 | **Evidence expiring AFTER publication is still caught** (not a one-time check) | PASS |
| QA-GATE-07 | An asset without cleared rights or alt text blocks publication | PASS |

### Authorization — `tests/int/authorization.int.spec.ts` (8)
| ID | Assertion | Result |
|---|---|---|
| QA-AUTH-01 | An anonymous read never returns drafts | PASS |
| QA-AUTH-02 | An anonymous read of inquiries is denied outright | PASS |
| QA-AUTH-03 | An editor cannot approve evidence (no self-approval) | PASS |
| QA-AUTH-04 | An evidence reviewer can approve evidence | PASS |
| QA-AUTH-05 | An editor cannot grant themselves a role | PASS |
| QA-AUTH-06 | An editor cannot change global navigation | PASS |
| QA-AUTH-07 | A route owner sees only their assigned routes | PASS |
| QA-AUTH-08 | Audit events cannot be created or altered through the API | PASS |

### Inquiries and delivery — `tests/int/inquiries.int.spec.ts` (15)
| ID | Assertion | Result |
|---|---|---|
| QA-ROUTE-01 | All seven routes accept a qualified submission | PASS |
| QA-ROUTE-02 | Missing qualification is rejected with per-field errors | PASS |
| QA-ROUTE-03 | Submission without privacy consent is rejected | PASS |
| QA-ROUTE-04 | **A retry does not create a duplicate lead** | PASS |
| QA-ROUTE-05 | Durable outbox rows are written, not a fire-and-forget promise | PASS |
| QA-ROUTE-06 | **A route with no configured owner reports failure, never success** | PASS |
| QA-ROUTE-07 | **Delivery failure retries with backoff and never marks delivered** | PASS |
| QA-ROUTE-08 | **A sender acknowledgement alone does not mark a lead delivered** | PASS |
| QA-ROUTE-09 | Consent denial records `consent-denied`, not an invented source | PASS |
| QA-ROUTE-10 | Granted consent preserves attribution; query strings stripped | PASS |
| QA-ROUTE-11 | An inquiry never subscribes the sender to the newsletter | PASS |
| QA-ROUTE-12 | The General route never escalates to Tel | PASS |
| QA-ROUTE-13 | SLA hours match the baseline exactly (4/24/48/72) | PASS |
| QA-ROUTE-14 | Elapsed and business-hours clocks differ; business avoids weekends | PASS |
| QA-SEC-01 | Repeated submissions from one client are rate limited | PASS |

### Architecture and analytics — `tests/int/architecture.int.spec.ts` (13)
| ID | Assertion | Result |
|---|---|---|
| QA-IA-01 | Exactly 15 page/template types, unique IDs and paths | PASS |
| QA-IA-02 | Primary navigation matches the approved seven | PASS |
| QA-IA-03 | Every page declares a primary CTA and MOD IDs | PASS |
| QA-IA-04 | Search results are never indexable | PASS |
| QA-IA-05 | Exactly seven routes with the baseline owner roles | PASS |
| QA-IA-06 | Every qualification field states a collection purpose | PASS |
| QA-IA-07 | 16 FRs, with FR-SEARCH-01 the only P1 | PASS |
| QA-SEARCH-01 | Public search returns published content and no drafts | PASS |
| QA-SEARCH-02 | Evidence and lead records are outside the searchable surface | PASS |
| QA-AN-01 | Event taxonomy matches the baseline names | PASS |
| QA-AN-02 | **Analytics parameters never carry personal data** | PASS |
| QA-AN-03 | Search terms are bucketed, never sent verbatim | PASS |
| QA-SEO-01 | Indexing is off until an origin is configured | PASS |

## Live verification against the running dev server

| Check | Result |
|---|---|
| All 15 public page/template routes | 200 (11 pages) / 404 for unknown detail slugs (4 templates, correct — no published records) |
| `/admin` | 200; login succeeds and returns the administrator with `roles: ['administrator']` |
| `/api/inquiries`, `/api/claims`, `/api/evidence-sources`, `/api/delivery-attempts`, `/api/users` unauthenticated | **403 on all five** |
| `/api/pages` unauthenticated | 200, `totalDocs = 0` — all 15 seeded pages are drafts and correctly invisible |
| `/api/pages?draft=true` unauthenticated | `totalDocs = 0` — **draft preview is not publicly reachable** |
| `/api/pages?draft=true` authenticated (JWT) | `totalDocs = 15`, all `draft` — protected preview works for staff |
| Cookie-authenticated API call without an `Origin` header | **403** — CSRF origin protection active |
| `robots.txt` | `User-Agent: * / Disallow: /` |
| `<meta name="robots">` on a public page | `noindex, nofollow, nocache` |
| Accessibility landmarks | skip link, `id="main"`, `aria-label="Primary"`, `aria-current="page"` all present |

## Defects found and fixed during Phase 0

| ID | Defect | Severity | Resolution |
|---|---|---|---|
| DEF-001 | Payload field-level access **silently strips** unauthorized fields and reports success — an editor could believe they had approved a claim | **S1** (governance failure disguised as success) | `src/access/guard.ts` rejects with 403 naming the accountable role. Must run as `beforeOperation`; `beforeValidate` already receives stripped data. QA-AUTH-03/05 |
| DEF-002 | Template `eslint.config.mjs` used `FlatCompat`, which throws a circular-structure error on ESLint 9.39 + eslint-config-next 16.3 | S3 | Replaced with the native flat configs `eslint-config-next` 16 exports |
| DEF-003 | Consent components used setState-inside-effect, flagged by `react-hooks/set-state-in-effect` | S3 | Rewritten with `useSyncExternalStore`, the correct primitive for a localStorage-backed store; also fixes cross-tab sync |
| DEF-004 | Contrast ratios in `tokens.css` were **estimated and several were wrong** (Gold-on-Navy stated 6.4:1, actually 7.46:1; Blue-on-White stated FAIL, actually 4.70:1 AA) | S2 (would have driven wrong design decisions) | All figures regenerated by `scripts/check-contrast.mjs`; the script is now the source of truth and fails CI-style on regression |
| DEF-005 | A one-off probe script wrote two rows into the **development** database (ESM import hoisting evaluated `payload.config` before the script reassigned `DATABASE_URI`) | S3 | Rows deleted; probe removed; test suite verified to be correctly isolated in `tel_ganesan_test` (37 claims / 52 inquiries / 22 users there, dev clean) |

## Gate status — engineering assessment, not an authorization

| Gate | Status | Blocking dependency |
|---|---|---|
| G0 Baseline Lock | **NOT PASSED** | Owner matrix unconfirmed; Appendix C decisions open; Keep/Rework inventory impossible without the demo audit |
| G1 Content Ready | **NOT PASSED** | No approved copy; six blocked claims; zero cleared assets |
| G2 UX/UI Ready | **NOT PASSED** | Token system and shell exist and are contrast-verified; no design review record |
| G3 Build Complete | **PARTIAL** | Foundation, CMS, 15 routes, 7 working routes, analytics/SEO scaffolding in staging-equivalent. Downloads, media players, schema and newsletter remain |
| G4 QA Passed | **NOT PASSED** | 43 automated tests pass, but no accessibility audit, no performance measurement, no device matrix, no security review |
| G5 Launch Authorized | **NOT PASSED** | Direction approval is not launch approval |
| G6 Stabilized | **NOT REACHED** | — |

**Code completion does not pass a gate.** Nothing in this repository has been deployed, and
no production DNS or live site has been touched.

## Not yet done — stated plainly

- No accessibility audit. No automated scan (axe/Lighthouse) and **no manual keyboard,
  zoom or screen-reader test**. Contrast is computed and passing; that is one criterion of
  many and is not accessibility acceptance.
- No performance measurement, and no agreed budgets to measure against.
- No browser/device matrix. Verified on macOS via HTTP only. Chrome, Safari, Edge, Firefox,
  iOS and Android are all **untested**.
- No security review, no dependency audit, no security headers, no TLS configuration.
- No backup, restore drill or rollback rehearsal.
- No production email provider; delivery proven only against a local sink.
- No GA4 property, so no live analytics evidence — only the taxonomy and its guards.
- No E2E browser tests (Playwright is not installed); form journeys are covered at the
  integration layer and by manual HTTP checks.

## Rollback procedure — drafted, NOT rehearsed

1. Redeploy the previous tagged release.
2. Application rollback alone is insufficient: **schema compatibility must be assessed**.
   Migrations are committed and ordered, and each has a generated `down`, but no down
   migration has been executed against data.
3. Media is not yet on durable production storage; that must be resolved before rollback is
   meaningful.
4. Restore the database from backup only if the schema moved incompatibly. **No backup or
   restore has been configured or tested.**

This procedure must be rehearsed before G5. It is currently a plan, not evidence.
