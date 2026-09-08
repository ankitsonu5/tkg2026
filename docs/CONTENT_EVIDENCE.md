# Content and Evidence — Blocked Items

The publication gate (`src/lib/evidence/gate.ts`) enforces the baseline's Section 9
publication rule in code. Nothing on this list can reach a public page until the named role
supplies the named evidence — this is enforced at write time, not by convention, and an
administrator cannot override it by ordinary editing.

## Seeded as BLOCKED — Section 9 High-Risk Evidence Queue

These six exist in the CMS as tracked evidence tasks with `status: blocked`, no approved
wording and no sources. **They are not public facts and must never be treated as drafts of
facts.**

| Claim ID | Exact dependency | Required evidence | Release rule | Responsible role |
|---|---|---|---|---|
| CLAIM-001 | Kyyba formation year: **1998 and 2005 both appear** in existing material | Formation record and approved corporate history | Hold until ONE dated wording is approved | Business Owner + Legal |
| CLAIM-002 | Workforce "**700+**" is neither scoped nor dated | Dated HR/operations report defining *employees* vs *associates* | No approximate marketing number may be published | Business Owner |
| CLAIM-003 | "**#1 on Starz**" lacks region, category and period | Dated official platform evidence | Qualified exact wording only | Business Owner + Legal |
| CLAIM-004 | Executive roles: **current vs former status may conflict** | Official organization/board record with term dates | Historical roles must be labelled *former* | Legal |
| CLAIM-005 | Film credits: producer/distribution role requires the **exact** credit | Contract, screen credit or official distributor record | No inferred role | Creative Producer + Legal |
| CLAIM-006 | Impact: legal status and people-served figures undefined | Formation/tax record and an auditable outcome methodology | No charitable or cumulative implication without proof | Business Owner + Legal |

## Structural blockers, enforced by default values

Three collections default to a status the gate rejects, so a record cannot be published by
forgetting to settle the question:

| Collection | Field | Default | Meaning |
|---|---|---|---|
| `entities` | `relationshipStatus` | `unresolved` | The exact current/former relationship wording has not been evidence-checked. |
| `projects` | `creditStatus` | `unresolved` | The exact screen credit has not been verified. |
| `initiatives` | `legalStatus` | `unresolved` | Legal entity status has not been established. |
| `articles` | `authorshipStatus` | `unresolved` | Authorship has not been settled. |

Every `initiatives.outcomes` entry additionally **requires** a linked claim and a
methodology note — an outcome figure cannot be entered without them.

## Asset and rights blockers

No asset can be published unless it is `rightsStatus: cleared`, within its licence expiry,
carries a credit where required, has a release on file where required, and has alt text
unless explicitly marked decorative. Video and audio additionally require captions or a
transcript. Only an Evidence Reviewer may clear rights — an editor attempting it is refused
with a 403, not silently ignored.

**Currently zero assets exist.** No portrait, logo, award, testimonial or documentary proof
has been fabricated. The `assets` collection has a `developmentPlaceholder` flag for clearly
identified placeholders; placeholders must never enter public release.

## What is NOT yet ingested

All ten Appendix B source documents were located on disk (see `docs/SOURCE_REGISTER.md`) but
have **not** been read into this build. Consequently:

- **No approved copy exists.** All 15 page records are drafts with baseline purpose text only.
- The Copy Deck, Content Blueprint, Visual Design System and CTA/Lead-Routing Matrix must be
  reconciled against `src/baseline/` in Phase 1. Differences are change requests in either
  direction — neither side silently wins.
- The Asset and Evidence Register spreadsheet should seed the `claims`, `evidence-sources`
  and `assets` collections rather than being re-keyed by hand.

## Privacy content

`site-settings.privacyPolicyVersion` is literally `draft-unapproved`, and every consent
record captured so far is stamped with that value. The Privacy and Accessibility pages are
routable and return 200, but hold **no reviewer-approved content**. Retention periods are not
implemented because they require reviewer decisions that have not been supplied.
