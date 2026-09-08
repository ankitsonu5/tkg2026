# Decisions, Risks and Change Requests

## Appendix C — open decisions before G0

| Decision | Baseline default | Status | Consequence in code today |
|---|---|---|---|
| Production domain and hosting | Confirm before canonical/redirect freeze | **OPEN** | `productionOrigin` is empty, so **no canonical is emitted** and `sitemap.xml` returns empty. Deliberate: a guessed origin bakes a wrong absolute URL into every page. |
| Named owners and backups for seven routes | Assign before forms enter UAT | **OPEN** | All routes `acceptanceStatus: unassigned` with local test recipients. See `OWNERS_AND_ROUTES.md`. |
| Final public wording for identity and the Kyyba relationship | Approved positioning; evidence-check titles | **OPEN** | Positioning line and master statement are seeded verbatim from the baseline. Kyyba has no entity record — none was invented. |
| Current venture/project status and prominence | Publish only current verified relationships | **OPEN** | Zero entities, projects and initiatives exist. `relationshipStatus` defaults to `unresolved`. |
| Legal/privacy policy, retention and contact | Approve before form acceptance | **OPEN** | Policy version is `draft-unapproved`; retention is not implemented. |
| Evidence strategy for unsupported demo claims | Verify, qualify or remove; never carry by default | **PARTIALLY ACTIONED** | All six high-risk topics seeded as BLOCKED claims. Nothing carried forward by default. |
| Go-live calendar | Commit after G0 owner/evidence assessment | **OPEN** | No date claimed anywhere. |

## Additional decisions surfaced during Phase 0

| Decision | Why it matters | Recommendation |
|---|---|---|
| **SLA clock: elapsed or business hours?** | The baseline gives hours but not the clock. A 4h media SLA starting 16:00 Friday means 20:00 Friday (elapsed) or Monday morning (business). | Route owners decide per route. Both implemented; `elapsed` seeded. Holiday calendar still needed for business mode. |
| **URL paths are proposed, not frozen** | The handoff's paths (`/enterprise-investments`, `/film-culture`, `/media-speaking`) are technical proposals. Canonicals and the redirect register depend on them. | Freeze into the SEO register before G3. Changing one afterwards requires a redirect record. |
| **Which baseline artefact governs — PDF or DOCX?** | Both exist with different hashes and have not been diffed. | Confirm the PDF is authoritative (assumed here), or raise a CR. |
| **Deployment target** | Determines performance budgets, rollback mechanics and media storage. | Decide before Phase 3; nothing in the build assumes a platform. |
| **Performance budgets are undefined** | The baseline supplies no numeric thresholds, but FR-PERF-01 is P0 and gates release. | Propose budgets in Phase 3 and have them agreed; a P0 requirement cannot be tested against an unstated threshold. |

## Keep / Rework / Replace / Retire inventory — BLOCKED

Action 3 of the baseline's Immediate Action Plan requires mapping current demo
URLs/sections/assets to Keep, Rework, Replace or Retire.

**This cannot start.** Neither the Hostinger demo URL, access to it, nor the 07 Sep 2026 live
demo audit has been supplied. The `redirects` collection is therefore **empty**, and its
`decision` field defaults to `undecided` so that an inventoried-but-unmapped legacy URL is a
visible task rather than a silent redirect.

The baseline explicitly forbids redirecting every missing URL to Home. Nothing here invents a
legacy route.

## Baseline risk register — current state

| ID | Risk | Owner | State after Phase 0 |
|---|---|---|---|
| R-01 | Claims and roles lack authoritative evidence | Business + Legal | **Active, contained.** Six blocked claims tracked; the gate makes publishing them impossible rather than merely discouraged. |
| R-02 | Rights-cleared photos, video, logos, releases missing | Creative Producer | **Active.** Zero assets. Gate blocks uncleared/unaccessible assets. Nothing fabricated. |
| R-03 | Route owners or SLAs not accepted | Ankit | **Active — largest blocker.** All 7 routes work; none is accepted. |
| R-04 | Legacy/V2 direction enters build without change control | Ankit | **Contained.** `src/baseline/` is the single source of truth; `pageId` is a constrained, administrator-only select, so a page cannot appear outside the approved architecture. |
| R-05 | Demo content reused without module/evidence mapping | Content Lead | **Contained by inability.** No demo content was accessible, and none was reproduced from memory. |
| R-06 | Privacy, consent and retention decisions open | Privacy Reviewer | **Active.** Consent is captured and enforced; the policy behind it is unapproved and retention is unimplemented. |
| R-07 | Production domain, hosting, monitoring, rollback unresolved | Technical Lead | **Active.** Canonicals/sitemap suppressed until resolved. |
| R-08 | Stakeholders approve visuals without testing conversion | QA Lead | **Contained.** 43 automated tests assert conversion behaviour, not appearance; release gates are objective. |

### New risks identified during Phase 0

| ID | Risk | Impact | Response |
|---|---|---|---|
| R-09 | **Silent field stripping created a false sense of control.** Payload's field-level access removes an unauthorized field and reports success — an editor could believe they had approved a claim. | Governance failure that looks like success | **Resolved.** `src/access/guard.ts` rejects with 403 and names the accountable role. Covered by QA-AUTH-03/05. |
| R-10 | Source documents exist but are un-ingested, so `src/baseline/` may diverge from the Copy Deck, Content Blueprint, Visual Design System and CTA Matrix. | Rework; conflicting sources of truth | Reconcile in Phase 1; resolve differences as dated change requests in both directions. |
| R-11 | Business-hours SLA mode has no public-holiday calendar. | An SLA could be reported met when an owner was unreachable | Supply the calendar, or standardise on elapsed hours. |
| R-12 | No production email provider; delivery proven only against a local sink. | Route acceptance cannot complete | Configure a provider, then re-run the smoke test against real destinations and reconcile bounces. |

## Change requests

None raised. No deviation from the business baseline has been made — only the technical
choices the handoff explicitly designates as proposed defaults (see `ARCHITECTURE.md`).
