# Form delivery and routing audit — 22 September 2026

## Verdict

Local/staging-equivalent delivery is verified end to end. Production delivery is **not
accepted** because the current application database still contains `@localhost.test`
primary/backup destinations and the configured SMTP transport is a local capture service.
The application now exposes that state on Connect and blocks those placeholder routes when
`NODE_ENV=production`; it cannot silently report a production delivery.

## Traceable end-to-end proof

Command: `npm run test:forms:e2e` (with `npm run mail:dev` running)

Run ID: `FORM-E2E-1790075369309`

| Flow | Reference / evidence | Result |
|---|---|---|
| Strategic Partnership | `STRA-2026-1412165C`; primary, backup and sender messages captured | PASS |
| Investment / M&A | `INVE-2026-4A227BD2`; primary, backup and sender messages captured | PASS |
| Speaking | `SPEA-2026-D85BF703`; primary, backup and sender messages captured | PASS |
| Media | `MEDI-2026-46C62C0C`; primary, backup and sender messages captured | PASS |
| Creative | `CREA-2026-41694C05`; primary, backup and sender messages captured | PASS |
| Impact | `IMPA-2026-5ACB85AE`; primary, backup and sender messages captured | PASS |
| General | `GENE-2026-D2598766`; primary, backup and sender messages captured | PASS |
| Newsletter | confirmation email captured, first confirmation accepted, token reuse rejected, final state `subscribed` | PASS |

For each Connect reference the proof chain was:

1. Qualified submission created one lead with a unique reference.
2. Durable outbox created the configured primary, backup and sender-ack destinations.
3. The delivery worker received an SMTP provider acceptance response for every destination.
4. Every attempt became `sent` with `providerMessageId`; the lead became `delivered` only
   after an owner destination succeeded.
5. The local SMTP sink wrote the matching reference and envelope destination to `.mail/*.eml`.

The seven routes produced 21 run-specific email captures; newsletter produced one. The
worker also drained older queued test messages during this run, so its total new-file count
was higher than the 22 messages belonging to this proof set.

## Automated test cases

Form-specific command:

```text
npx vitest run --config ./vitest.config.mts \
  tests/int/inquiries.int.spec.ts \
  tests/int/newsletter.int.spec.ts \
  tests/int/form-ui.int.spec.tsx
```

Result: **27/27 PASS**.

| Case | Coverage | Result |
|---|---|---|
| QA-ROUTE-01 | All seven qualified inquiry routes accept valid submissions | PASS |
| QA-ROUTE-02/03 | Missing required qualification and privacy consent | PASS |
| QA-ROUTE-03A | Invalid email, impossible date, unknown select value and overlong input | PASS |
| QA-ROUTE-04 | Idempotent retry does not duplicate a lead | PASS |
| QA-ROUTE-05 | Lead and durable outbox persistence | PASS |
| QA-ROUTE-06 | No owner destination produces an honest failure | PASS |
| QA-ROUTE-06A | Production blocks placeholder recipients even if marked accepted | PASS |
| QA-ROUTE-07 | Transport failure retries and never creates false delivery success | PASS |
| QA-ROUTE-08 | Sender acknowledgement alone cannot mark owner delivery complete | PASS |
| QA-ROUTE-08A | All seven routes reach exact primary, backup and sender destinations with provider receipts | PASS |
| QA-ROUTE-09/10 | Consent-aware attribution behavior | PASS |
| QA-ROUTE-11 | Inquiry without opt-in never creates a newsletter subscription | PASS |
| QA-ROUTE-11A | Explicit inquiry opt-in sends the separate double-opt-in email | PASS |
| QA-ROUTE-12/13/14 | General escalation prohibition and SLA configuration | PASS |
| QA-SEC-01 | Submission rate limiting | PASS |
| QA-NEWS-01 | Newsletter email and server-side privacy consent validation | PASS |
| QA-NEWS-02 | Transport acceptance, absolute confirmation URL and stored provider receipt | PASS |
| QA-NEWS-03 | Confirmation changes state and token is single-use | PASS |
| QA-NEWS-04 | Rejected email destination produces failure, not success | PASS |
| QA-NEWS-05 | Expired confirmation token is rejected and invalidated | PASS |
| QA-UI-01 | Newsletter required-field error is visible and backend is not called | PASS |
| QA-UI-02 | Newsletter success replaces form with confirmation instruction | PASS |
| QA-UI-03 | Connect confirmation shows route state, reference and newsletter result | PASS |
| QA-SEARCH-01 | GET search form returns only published public content | PASS |

The full repository suite ran 53 tests: 51 passed and two unrelated architecture assertions
failed because `TERMS` was added as a sixteenth page while those tests still hard-code 15
pages and require every policy page to have a primary CTA.

## Issues fixed

- Newsletter privacy consent is now enforced on the server, not only in browser state.
- Connect's explicit newsletter checkbox now starts the separate double-opt-in flow and
  reports its result without changing the inquiry delivery result.
- Confirmation tokens now expire after 48 hours and are invalidated after first use.
- SMTP resolved-but-rejected recipients are treated as failures.
- Provider message IDs are persisted for inquiry and newsletter delivery evidence.
- Impossible calendar dates such as `2027-02-31` are rejected server-side.
- Production placeholder destinations are blocked and shown as not production-ready.
- Payload globals are registered, restoring form privacy-policy/version lookup.
- The integration harness now uses the MongoDB adapter's isolated test database instead of
  an obsolete Postgres URL, and forces `NODE_ENV=test`.

## Production acceptance — open

| Required proof | Current result |
|---|---|
| Named primary and backup owner for each route | FAIL — database destinations are `@localhost.test` aliases |
| Real production SMTP/provider configuration | FAIL — current transport is local SMTP capture |
| Provider acceptance at each real owner mailbox | NOT RUN |
| Sender acknowledgement received in a real external mailbox | NOT RUN |
| Newsletter confirmation received and clicked from a real external mailbox | NOT RUN |
| Written owner acceptance (`acceptedBy`, `acceptedAt`) matching the real mailboxes | NOT VERIFIED |

Production can be marked complete only after those real addresses and SMTP credentials are
configured and `npm run test:forms:e2e` (or the same proof journey in the deployed
environment) passes against the real destinations.
