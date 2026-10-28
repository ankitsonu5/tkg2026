import { defineModel, refMany } from './base'

/** CLAIM records: every material public statement and its approval state. */
export const Claim = defineModel('claims', {
  claimId: String,
  exactWording: String,
  qualifier: String,
  riskLevel: { type: String, default: 'material' },
  verificationOwnerRole: { type: String, default: 'Business Owner' },
  riskReviewerRole: { type: String, default: 'Legal' },
  sources: refMany('evidence-sources'),
  status: { type: String, default: 'blocked' },
  approvedWording: String,
  approvalDate: Date,
  reviewDate: Date,
  blockingReason: String,
})

export const EvidenceSource = defineModel('evidence-sources', {
  title: String,
  sourceType: String,
  strength: { type: String, default: 'weak' },
  dated: Date,
  reference: String,
  notes: String,
  withdrawn: { type: Boolean, default: false },
})

/**
 * AST records: the asset and rights register. The file itself lives in `media/` (or Vercel
 * Blob) and is served by GET /api/assets/file/:filename only once rights are cleared.
 */
export const Asset = defineModel('assets', {
  assetId: String,
  alt: String,
  decorative: { type: Boolean, default: false },
  rightsStatus: { type: String, default: 'unverified' },
  source: String,
  permittedUsage: String,
  rightsExpiry: Date,
  creditRequired: { type: Boolean, default: false },
  credit: String,
  releaseRequired: { type: Boolean, default: false },
  releaseOnFile: { type: Boolean, default: false },
  captionsOrTranscript: String,
  version: { type: String, default: 'v1' },
  developmentPlaceholder: { type: Boolean, default: false },
  url: String,
  filename: String,
  mimeType: String,
  filesize: Number,
  width: Number,
  height: Number,
  focalX: Number,
  focalY: Number,
  prefix: String,
})
