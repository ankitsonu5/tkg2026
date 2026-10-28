import { data } from '../data/client'
import { assertEmailAccepted, providerMessageId } from '../lib/email/delivery-receipt'
import { esc, INK, layout } from '../lib/email/template'
import type { StaffUser } from './auth'
import { inquiryToLead, subscriptionToLead, type Lead, type LeadType } from './leads'

/**
 * Reply to a lead from the admin, sent through the site's own mail transport (no desktop email
 * app needed). An inquiry that was still "new"/"acknowledged" becomes "responded", and the
 * reply is noted on the record and in the activity log.
 */

export class ReplyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function replyToLead(args: {
  type: LeadType
  id: string
  subject: unknown
  message: unknown
  staff: StaffUser
  /** Route-owner restriction; null = all routes. */
  routes: string[] | null
}): Promise<Lead> {
  const subject = typeof args.subject === 'string' ? args.subject.trim().slice(0, 200) : ''
  const message = typeof args.message === 'string' ? args.message.trim().slice(0, 20_000) : ''
  if (!subject) throw new ReplyError('Add a subject.', 400)
  if (message.length < 2) throw new ReplyError('Write a message before sending.', 400)

  const collection = args.type === 'inquiry' ? 'inquiries' : 'newsletter-subscriptions'
  const doc = (await data.findByID({ collection, id: args.id, depth: 0 }).catch(() => null)) as Record<string, any> | null
  if (!doc) throw new ReplyError('Lead not found.', 404)
  if (args.type === 'inquiry' && args.routes && !args.routes.includes(String(doc.route))) throw new ReplyError('Lead not found.', 404)

  const to = String(doc.email ?? '')
  if (!to) throw new ReplyError('This lead has no email address.', 400)

  const html = layout({
    preheader: message.slice(0, 120),
    eyebrow: 'Tel K. Ganesan',
    title: subject,
    body: `<div style="font-size:15px;line-height:1.75;color:${INK};white-space:pre-wrap;">${esc(message)}</div>`,
    footer: doc.reference ? `Reference ${esc(doc.reference)}. Reply to this email to continue the conversation.` : 'Reply to this email to continue the conversation.',
  })

  let receipt: unknown
  try {
    receipt = await data.sendEmail({ to, subject, text: message, html })
    assertEmailAccepted(receipt, to)
  } catch (error) {
    console.error('lead reply failed:', error)
    throw new ReplyError('The email could not be sent. Please try again in a moment.', 502)
  }

  const now = new Date()
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ')
  const who = args.staff.name || args.staff.username || args.staff.email
  if (args.type === 'inquiry') {
    const patch: Record<string, unknown> = {
      internalNotes: [doc.internalNotes, `[${stamp} UTC] ${who} replied by email: "${subject}"`].filter(Boolean).join('\n'),
    }
    if (doc.workState === 'new' || doc.workState === 'acknowledged') {
      patch.workState = 'responded'
      patch.respondedAt = now.toISOString()
    }
    await data.update({ collection: 'inquiries', id: args.id, data: patch })
  }

  await data
    .create({
      collection: 'audit-events',
      data: {
        event: 'admin.lead_reply',
        subjectCollection: collection,
        subjectId: args.id,
        actor: `staff:${args.staff.email || args.staff.username}`,
        detail: `Replied by email ("${subject}")${providerMessageId(receipt) ? ` · message ${providerMessageId(receipt)}` : ''}`,
        occurredAt: now.toISOString(),
      },
    })
    .catch(() => undefined)

  const fresh = (await data.findByID({ collection, id: args.id, depth: 0 })) as Record<string, any>
  return args.type === 'inquiry' ? inquiryToLead(fresh) : subscriptionToLead(fresh)
}
