# Owners and Routes

## Status: NO route is accepted for production

All seven routes are configured and working, and all seven deliver end to end in
development. **None has a named owner, a real mailbox, or a written acceptance.** This is
risk **R-03** in the baseline, and it is the single largest blocker to route UAT.

Recipients seeded by `npm run seed:dev` are local test addresses
(`route-owner+<route>@localhost.test`). They resolve to nothing; the local capture accepts
them. No real person's address has been invented.

## The seven routes

| Route ID | Route | Owner role (fixed by baseline) | SLA | Escalates to Tel when | Named owner | Backup | Acceptance |
|---|---|---|---|---|---|---|---|
| `strategic-partnership` | Strategic Partnership | Partnership Lead | 24h | Material enterprise value, capital, reputation or relationship | **TBD** | **TBD** | Unassigned |
| `investment-ma` | Investment / M&A | Chief of Staff | 24h | M&A, capital allocation, governance or irreversible commitment | **TBD** | **TBD** | Unassigned |
| `speaking` | Speaking | Media & Speaking Lead | 24h | Strategic audience, major fee, schedule or reputation tradeoff | **TBD** | **TBD** | Unassigned |
| `media` | Media | PR / Media Lead | **4h** | Tier-one outlet, crisis, legal sensitivity or same-day response | **TBD** | **TBD** | Unassigned |
| `creative` | Creative | Film & Culture Lead | 72h | Material rights, financing, distribution or reputation exposure | **TBD** | **TBD** | Unassigned |
| `impact` | Impact | Impact Lead | 48h | Public commitment, board role, major funding or reputation | **TBD** | **TBD** | Unassigned |
| `general` | General | Website Coordinator | 48h | **Never** — reclassify to the correct owner | **TBD** | **TBD** | Unassigned |

The 4-hour media SLA is the tightest in the baseline and has real staffing implications: it
needs an owner who is reachable within business hours, and a backup who genuinely covers.

## Escalation is a human decision

An overdue lead reminds the **route owner and backup**. It never escalates to Tel
automatically. Escalation is judged against each route's stated criterion and recorded by a
person. `general` never escalates to Tel at all (enforced in code and by `QA-ROUTE-12`).

This directly serves the baseline's operational-independence outcome: Tel receives
consequential decisions, not routine intake.

## Open operational decision: what does "24 hours" mean?

The baseline states hours but not whether they are **elapsed** or **business** hours, nor
which timezone or holiday calendar applies. Both clocks are implemented and selected per
route via `slaClock`; the seed defaults to `elapsed` with `America/Detroit`.

This is not a detail. A media inquiry arriving 16:00 Friday is due 20:00 Friday under
elapsed hours, but Monday morning under business hours. **The route owners must decide**, and
business-hours mode does not yet account for public holidays.

## What must happen before any route is accepted

1. Name an owner and a backup for each of the seven routes.
2. Obtain **written** acknowledgement from each owner: they accept the role, the SLA and the
   escalation criterion.
3. Decide the SLA clock policy (elapsed vs business hours, timezone, holiday calendar).
4. Configure real mailboxes in the `inquiry-routes` records and set `acceptanceStatus` to
   `accepted`, with `acceptedBy` and `acceptedAt` recorded verbatim.
5. Configure a production email provider (TLS + credentials).
6. Re-run the end-to-end journey against the real destinations and reconcile every test lead
   at its destination (`npx tsx scripts/smoke-inquiry.ts`).

Until step 4, the Connect page shows an honest notice on any route that is not accepted.

## Evidence held today

`scripts/smoke-inquiry.ts`, run 08 Sep 2026 against local capture:

| Route | Reference | Submission | After worker |
|---|---|---|---|
| strategic-partnership | STRA-2026-378640CE | pending | delivered |
| investment-ma | INVE-2026-B303ACB3 | pending | delivered |
| speaking | SPEA-2026-6B1A26CE | pending | delivered |
| media | MEDI-2026-73EC7E20 | pending | delivered |
| creative | CREA-2026-DA099CB5 | pending | delivered |
| impact | IMPA-2026-DE5D155D | pending | delivered |
| general | GENE-2026-E262B0AD | pending | delivered |

21 messages captured (7 × owner + backup + sender acknowledgement); worker reported
`claimed=21 sent=21 failed=0 dead=0`.

**This is evidence that the mechanism works. It is not route acceptance**: the destinations
were local test addresses, not owners.
