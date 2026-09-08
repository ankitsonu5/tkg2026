# Source Register

Frozen at Phase 0. Every controlled input to this build, with its hash at the time of
freezing. If a source changes, its hash changes and the affected work is re-reviewed.

## Governing baseline

| Field | Value |
|---|---|
| Document | Tel K. Ganesan Website — Master Business Requirements & Implementation Baseline |
| Version | 1.0 — Proposed controlled baseline |
| Dated | 07 September 2026 |
| Document owner | Ankit Srivastava — Website Implementation Lead |
| Executive sponsor | Tel K. Ganesan |
| File | `Tel_K_Ganesan_Website_Master_Baseline_v1.pdf` |
| Location at freeze | `~/Downloads/Tel_K_Ganesan_Website_Master_Baseline_v1.pdf` (outside the repo) |
| SHA-256 | `41d0ca02cea00dea138f44453c82e0a478d6ddf2033e31f5374102a0eb6090c9` |
| Size | 409,831 bytes |

A `.docx` of the same baseline also exists
(`Tel_K_Ganesan_Website_Master_Baseline_v1.0.docx`, SHA-256 `6b6eef4e…`). **The PDF is
authoritative for this build.** The two have not been diffed; if the `.docx` is meant to
govern instead, that is a change request.

## Approval status — stated precisely

- **Reported to the implementation team:** Tel approved the *direction*. This is recorded as
  reported, and development of reversible work proceeded on that basis.
- **In the baseline document itself:** the Approval Record still reads **Pending** for the
  Executive Sponsor, Business/Editorial Owner, Technical Lead and QA Lead. Only the
  Implementation Owner row is marked Prepared (07 Sep 2026).
- **Not held:** no approval date, no signature, no content clearance, no launch
  authorization. None of these has been invented, and none is implied by anything in this
  repository.

Direction approval is **not** launch approval. See `docs/QA_AND_RELEASE.md`.

## Appendix B source documents — availability

All ten of the source documents named in the baseline's Appendix B were located on the
implementation lead's machine at
`~/Downloads/resharingtkgwebsitewireframeprogress/`. They are **located and hashed but not
yet ingested**: reading their content into the CMS is Phase 1 (Content and UX foundation)
work, not Phase 0 scaffolding. They have deliberately NOT been copied into this repository,
which is a code repository, not the document of record.

| Appendix B source | File | SHA-256 (first 16) | Status |
|---|---|---|---|
| Website Creative Brief | `Tel_K_Ganesan_Website_Creative_Brief.docx` | `e156d99415d1a6f9` | Located, not ingested |
| Page-by-Page Content Blueprint | `Tel_K_Ganesan_Page_by_Page_Content_Blueprint.docx` | `106b33c0715ffc54` | Located, not ingested |
| Website Copy Deck | `Tel_K_Ganesan_Website_Copy_Deck.docx` | `5ac681183b53b73d` | Located, not ingested |
| Visual Design System | `Tel_K_Ganesan_Website_Visual_Design_System.docx` | `01311aecfecb3f8b` | Located, not ingested |
| Functional Requirements Document | `Tel_K_Ganesan_Website_Functional_Requirements_Document.docx` | `3373d3d5893d241e` | Located, not ingested |
| CTA and Lead-Routing Matrix | `Tel_K_Ganesan_Website_CTA_and_Lead_Routing_Matrix.xlsx` | `436ac9f8c61f42a9` | Located, not ingested |
| Asset and Evidence Register | `Tel_K_Ganesan_Website_Asset_and_Evidence_Register.xlsx` | `df909ea8d75f5013` | Located, not ingested |
| SEO and Metadata Workbook | `Tel_K_Ganesan_Website_SEO_and_Metadata_Workbook.xlsx` | `45469f211f671977` | Located, not ingested |
| QA and Acceptance Checklist | `Tel_K_Ganesan_Website_QA_and_Acceptance_Checklist.xlsx` | `499e82011707b2b3` | Located, not ingested |
| Launch and Governance Playbook | `Tel_K_Ganesan_Website_Launch_and_Governance_Playbook.docx` | `552f490e55a39ec7` | Located, not ingested |

### Not supplied

| Source | Status | Consequence |
|---|---|---|
| Live demo audit — 07 Sep 2026 | **NOT SUPPLIED** | The Keep/Rework/Replace/Retire inventory in `docs/DECISIONS_AND_RISKS.md` cannot be completed, and the legacy URL inventory that the redirect register depends on cannot begin. |
| Hostinger demo URL / access | **NOT SUPPLIED** | Same as above. No legacy URL has been invented, and the `redirects` collection is empty rather than populated with guesses. |

## What Phase 0 built from

Phase 0 used **only** the baseline PDF and the developer handoff prompt. Specifically, the
15 page/template definitions, the seven inquiry routes with their SLAs and escalation
criteria, the event taxonomy, the functional requirement IDs and the palette are transcribed
from the PDF into `src/baseline/` and `src/app/(frontend)/tokens.css`.

**Important consequence:** because the Copy Deck, Content Blueprint, Visual Design System and
CTA/Lead-Routing Matrix have not been ingested, the module structure, field-level
qualification wording and visual system in this build are derived from the baseline PDF's
summary tables. They must be reconciled against those four documents in Phase 1, and
differences resolved as change requests rather than silently overwritten in either direction.
