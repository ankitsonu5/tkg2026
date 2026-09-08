import type { CollectionConfig } from 'payload'

import { evidenceWrite, contentWrite, roleFieldAccess } from '@/access'
import { guardPrivilegedFields } from '@/access/guard'

/**
 * AST records — the asset and rights register, backed by the upload store.
 *
 * Public read is intentionally NOT unconditional: an asset only becomes publicly readable
 * once its rights are cleared, so an uncleared file cannot be served from a media URL even
 * if someone guesses it.
 */
export const Assets: CollectionConfig = {
  slug: 'assets',
  upload: {
    // Local disk in development; swap for an object-storage adapter in production.
    staticDir: 'media',
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 800, height: 600, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
      { name: 'social', width: 1200, height: 630, position: 'centre' },
    ],
  },
  admin: {
    useAsTitle: 'assetId',
    group: 'Evidence',
    defaultColumns: ['assetId', 'rightsStatus', 'credit', 'rightsExpiry'],
  },
  hooks: {
    beforeOperation: [
      guardPrivilegedFields({
        fields: ['rightsStatus'],
        allowedRoles: ['evidence-reviewer'],
        message: 'Only an Evidence Reviewer may clear asset rights.',
      }),
    ],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true
      // Anonymous visitors only ever see cleared assets.
      return { rightsStatus: { equals: 'cleared' } }
    },
    create: contentWrite,
    update: contentWrite,
    delete: evidenceWrite,
  },
  fields: [
    { name: 'assetId', type: 'text', required: true, unique: true, index: true, admin: { description: 'Stable asset ID, e.g. AST-015.' } },
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Alt text. Required unless the asset is marked decorative — the gate enforces this.',
        condition: (data) => !data?.decorative,
      },
    },
    { name: 'decorative', type: 'checkbox', defaultValue: false, admin: { description: 'Decorative assets are exposed to assistive technology as empty alt.' } },
    {
      name: 'rightsStatus',
      type: 'select',
      required: true,
      defaultValue: 'unverified',
      index: true,
      options: [
        { label: 'Unverified — not usable', value: 'unverified' },
        { label: 'Requested — permission pending', value: 'requested' },
        { label: 'Cleared — approved for the stated usage', value: 'cleared' },
        { label: 'Refused / withdrawn', value: 'refused' },
      ],
      // Rights clearance is a reviewer decision, not an editorial one.
      access: { update: roleFieldAccess('evidence-reviewer') },
    },
    { name: 'source', type: 'text', admin: { description: 'Where the file came from: photographer, distributor, licence reference.' } },
    { name: 'permittedUsage', type: 'textarea', admin: { description: 'Exactly what this licence permits. Usage beyond this is a rights breach.' } },
    { name: 'rightsExpiry', type: 'date', admin: { description: 'Licence expiry. Once passed, dependent content is unpublished by the re-check sweep.' } },
    { name: 'creditRequired', type: 'checkbox', defaultValue: false },
    { name: 'credit', type: 'text', admin: { condition: (data) => Boolean(data?.creditRequired) } },
    { name: 'releaseRequired', type: 'checkbox', defaultValue: false, admin: { description: 'Set when identifiable people appear and a signed release is needed.' } },
    { name: 'releaseOnFile', type: 'checkbox', defaultValue: false, admin: { condition: (data) => Boolean(data?.releaseRequired) } },
    { name: 'captionsOrTranscript', type: 'textarea', admin: { description: 'Captions or transcript reference. Required for video and audio (FR-MEDIA-01).' } },
    { name: 'version', type: 'text', defaultValue: 'v1' },
    {
      name: 'developmentPlaceholder',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Clearly identified development placeholder. Placeholders must never enter public release.' },
    },
  ],
}
