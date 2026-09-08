import type { PayloadRequest, Payload } from 'payload'

/**
 * PUBLICATION GATE — Section 9 of the Master Implementation Baseline.
 *
 * "A module cannot publish if it contains an unverified material claim, unresolved
 *  role/entity status, expired evidence, uncleared rights, missing release/credit or
 *  missing accessibility metadata."
 *
 * Design notes:
 *  - This is enforced server-side in a collection hook, so it applies to the admin UI, the
 *    REST API, GraphQL and any Local API call that does not explicitly override access.
 *  - It is NOT a one-time check. `findPublishedViolations` re-runs the same rules across
 *    already-published content so that evidence which expires or is withdrawn after
 *    publication is caught by the scheduled job in src/jobs/evidence-recheck.ts.
 *  - An administrator cannot bypass it by ordinary editing: the hook does not inspect roles.
 */

export type ViolationCode =
  | 'CLAIM_NOT_READY'
  | 'CLAIM_WORDING_MISMATCH'
  | 'CLAIM_EVIDENCE_EXPIRED'
  | 'CLAIM_MISSING_SOURCE'
  | 'ASSET_RIGHTS_NOT_CLEARED'
  | 'ASSET_RIGHTS_EXPIRED'
  | 'ASSET_MISSING_CREDIT'
  | 'ASSET_MISSING_RELEASE'
  | 'ASSET_MISSING_ALT_TEXT'
  | 'ASSET_MISSING_CAPTIONS'
  | 'STATUS_UNRESOLVED'

export interface GateViolation {
  code: ViolationCode
  /** Human-readable, corrective: says what to fix and who owns it. */
  message: string
  /** CLAIM-*/ /** AST-* or the field path that failed. */
  ref: string
}

export interface GateResult {
  ok: boolean
  violations: GateViolation[]
}

interface ClaimRecord {
  id: string | number
  claimId?: string | null
  status?: string | null
  approvedWording?: string | null
  exactWording?: string | null
  reviewDate?: string | null
  verificationOwnerRole?: string | null
  sources?: unknown
}

interface AssetRecord {
  id: string | number
  assetId?: string | null
  rightsStatus?: string | null
  rightsExpiry?: string | null
  creditRequired?: boolean | null
  credit?: string | null
  releaseRequired?: boolean | null
  releaseOnFile?: boolean | null
  decorative?: boolean | null
  alt?: string | null
  mimeType?: string | null
  captionsOrTranscript?: string | null
}

function isExpired(value?: string | null): boolean {
  if (!value) return false
  const t = Date.parse(value)
  if (Number.isNaN(t)) return false
  return t < Date.now()
}

function idOf(v: unknown): string | number | null {
  if (typeof v === 'string' || typeof v === 'number') return v
  if (v && typeof v === 'object' && 'id' in v) {
    const id = (v as { id: unknown }).id
    if (typeof v === 'object' && (typeof id === 'string' || typeof id === 'number')) return id
  }
  return null
}

/** Collect relationship ids from a field that may hold ids, populated docs, or a mix. */
function collectIds(value: unknown): (string | number)[] {
  if (!value) return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map(idOf).filter((v): v is string | number => v !== null)
}

export function evaluateClaim(claim: ClaimRecord): GateViolation[] {
  const violations: GateViolation[] = []
  const ref = claim.claimId || `claim:${claim.id}`

  if (claim.status !== 'ready') {
    violations.push({
      code: 'CLAIM_NOT_READY',
      ref,
      message: `Claim ${ref} has status "${claim.status ?? 'unset'}" and is not Ready. A verification owner and risk reviewer must complete the claim lifecycle before this content can publish.`,
    })
  }

  if (!claim.approvedWording || claim.approvedWording.trim() === '') {
    violations.push({
      code: 'CLAIM_WORDING_MISMATCH',
      ref,
      message: `Claim ${ref} has no approved public wording. Step 4 of the claim lifecycle (approve exact public wording and review date) is incomplete.`,
    })
  } else if (claim.exactWording && claim.exactWording.trim() !== claim.approvedWording.trim()) {
    violations.push({
      code: 'CLAIM_WORDING_MISMATCH',
      ref,
      message: `Claim ${ref} drafts wording that differs from the approved wording. Publish the approved wording exactly, or re-approve the new wording.`,
    })
  }

  if (isExpired(claim.reviewDate)) {
    violations.push({
      code: 'CLAIM_EVIDENCE_EXPIRED',
      ref,
      message: `Claim ${ref} passed its scheduled review date (${claim.reviewDate}). Reverify the claim or withdraw it; expired evidence cannot remain public.`,
    })
  }

  if (collectIds(claim.sources).length === 0) {
    violations.push({
      code: 'CLAIM_MISSING_SOURCE',
      ref,
      message: `Claim ${ref} has no attached evidence source. Step 3 of the claim lifecycle (attach source record and evidence strength) is incomplete.`,
    })
  }

  return violations
}

export function evaluateAsset(asset: AssetRecord): GateViolation[] {
  const violations: GateViolation[] = []
  const ref = asset.assetId || `asset:${asset.id}`

  if (asset.rightsStatus !== 'cleared') {
    violations.push({
      code: 'ASSET_RIGHTS_NOT_CLEARED',
      ref,
      message: `Asset ${ref} has rights status "${asset.rightsStatus ?? 'unset'}". The Creative Producer must record cleared rights and permitted usage before public release.`,
    })
  }

  if (isExpired(asset.rightsExpiry)) {
    violations.push({
      code: 'ASSET_RIGHTS_EXPIRED',
      ref,
      message: `Asset ${ref} has rights that expired on ${asset.rightsExpiry}. Renew the licence or replace the asset.`,
    })
  }

  if (asset.creditRequired && !asset.credit?.trim()) {
    violations.push({
      code: 'ASSET_MISSING_CREDIT',
      ref,
      message: `Asset ${ref} requires a credit line and none is recorded.`,
    })
  }

  if (asset.releaseRequired && !asset.releaseOnFile) {
    violations.push({
      code: 'ASSET_MISSING_RELEASE',
      ref,
      message: `Asset ${ref} requires a signed release and none is on file.`,
    })
  }

  // Accessibility metadata is part of the gate, not a separate nice-to-have.
  if (!asset.decorative && !asset.alt?.trim()) {
    violations.push({
      code: 'ASSET_MISSING_ALT_TEXT',
      ref,
      message: `Asset ${ref} is not marked decorative and has no alt text. Add alt text or mark it decorative (FR-A11Y-01).`,
    })
  }

  const isTimeBased = typeof asset.mimeType === 'string' && /^(video|audio)\//.test(asset.mimeType)
  if (isTimeBased && !asset.captionsOrTranscript?.trim()) {
    violations.push({
      code: 'ASSET_MISSING_CAPTIONS',
      ref,
      message: `Asset ${ref} is time-based media and has no captions or transcript reference (FR-MEDIA-01).`,
    })
  }

  return violations
}

/**
 * Status fields that block publication while unresolved. The baseline treats an unsettled
 * role, entity relationship or screen credit as a factual risk equal to a bad metric.
 */
export const STATUS_FIELDS = ['relationshipStatus', 'authorshipStatus', 'creditStatus', 'legalStatus'] as const

const STATUS_FIELD_LABELS: Record<(typeof STATUS_FIELDS)[number], string> = {
  relationshipStatus: 'Entity relationship status',
  authorshipStatus: 'Authorship status',
  creditStatus: 'Film credit status',
  legalStatus: 'Legal entity status',
}

export interface GateSubject {
  /** Relationship values pointing at the `claims` collection. */
  claims?: unknown
  /** Relationship values pointing at the `assets` collection. */
  assets?: unknown
  /** Entity/role/credit status fields, where the collection has one. */
  relationshipStatus?: unknown
  authorshipStatus?: unknown
  creditStatus?: unknown
  legalStatus?: unknown
  [key: string]: unknown
}

/**
 * Evaluate one document against the gate.
 * Resolves relationships through the Local API so the rules see current evidence state,
 * never a stale populated copy that was embedded when the document was first saved.
 */
export async function evaluatePublicationGate(args: {
  payload: Payload
  doc: GateSubject
  req?: PayloadRequest
}): Promise<GateResult> {
  const { payload, doc, req } = args
  const violations: GateViolation[] = []

  const claimIds = collectIds(doc.claims)
  const assetIds = collectIds(doc.assets)

  if (claimIds.length > 0) {
    const claims = await payload.find({
      collection: 'claims',
      where: { id: { in: claimIds } },
      limit: claimIds.length,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })

    const found = new Set(claims.docs.map((d) => String(d.id)))
    for (const id of claimIds) {
      if (!found.has(String(id))) {
        violations.push({
          code: 'CLAIM_NOT_READY',
          ref: `claim:${id}`,
          message: `Referenced claim ${id} no longer exists. Remove the reference or restore the claim record.`,
        })
      }
    }

    for (const claim of claims.docs) {
      violations.push(...evaluateClaim(claim as unknown as ClaimRecord))
    }
  }

  if (assetIds.length > 0) {
    const assets = await payload.find({
      collection: 'assets',
      where: { id: { in: assetIds } },
      limit: assetIds.length,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })

    const found = new Set(assets.docs.map((d) => String(d.id)))
    for (const id of assetIds) {
      if (!found.has(String(id))) {
        violations.push({
          code: 'ASSET_RIGHTS_NOT_CLEARED',
          ref: `asset:${id}`,
          message: `Referenced asset ${id} no longer exists. Remove the reference or restore the asset record.`,
        })
      }
    }

    for (const asset of assets.docs) {
      violations.push(...evaluateAsset(asset as unknown as AssetRecord))
    }
  }

  // Unresolved entity/role/credit status is its own gate condition in the baseline.
  for (const field of STATUS_FIELDS) {
    if (doc[field] === 'unresolved') {
      violations.push({
        code: 'STATUS_UNRESOLVED',
        ref: field,
        message: `${STATUS_FIELD_LABELS[field]} is still "unresolved". The baseline requires exact current/former wording backed by an official record before publication.`,
      })
    }
  }

  return { ok: violations.length === 0, violations }
}

export function formatViolations(violations: GateViolation[]): string {
  return violations.map((v) => `  • [${v.code}] ${v.message}`).join('\n')
}
