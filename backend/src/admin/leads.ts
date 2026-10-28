import ExcelJS from 'exceljs'

import { BASELINE_INQUIRY_ROUTES, getBaselineRoute } from '../baseline/inquiry-routes'
import { data } from '../data/client'
import type { Where } from '../data/where'

/**
 * Leads: every form submission on the website in one list — the seven Connect inquiry forms
 * and the newsletter signup — normalised to one shape for the admin "Leads" screen and the
 * Excel / CSV export.
 */

export type LeadType = 'inquiry' | 'newsletter'

export interface Lead {
  id: string
  type: LeadType
  /** Which form it came from, e.g. "Speaking inquiry" or "Newsletter signup". */
  source: string
  route: string | null
  name: string
  email: string
  status: string
  delivery: string | null
  reference: string | null
  createdAt: string
  replyDueAt: string | null
  sourcePage: string | null
  marketingOptIn: boolean | null
  /** Form answers with their on-form labels. */
  details: { label: string; value: string }[]
  attribution: Record<string, string>
  notes: string | null
}

export interface LeadQuery {
  type?: LeadType | 'all'
  route?: string
  status?: string
  search?: string
  from?: string
  to?: string
}

export interface LeadScope {
  canReadInquiries: boolean
  canReadNewsletter: boolean
  /** Route-owner restriction; null = all routes. */
  routes: string[] | null
}

const ROUTE_LABELS = Object.fromEntries(BASELINE_INQUIRY_ROUTES.map((r) => [r.routeId, r.label]))

function label(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

function iso(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function inquiryToLead(doc: Record<string, any>): Lead {
  const baseline = getBaselineRoute(String(doc.route))
  const fields = new Map((baseline?.fields ?? []).map((f) => [f.name, f]))
  const details = Object.entries((doc.qualification ?? {}) as Record<string, unknown>).map(([key, raw]) => {
    const field = fields.get(key)
    const option = field?.options?.find((o) => o.value === raw)
    const value = option ? option.label : typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw ?? '')
    return { label: field?.label ?? label(key), value }
  })
  const attribution = Object.fromEntries(
    Object.entries((doc.attribution ?? {}) as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => [label(k), String(v)]),
  )
  return {
    id: String(doc.id),
    type: 'inquiry',
    source: `${ROUTE_LABELS[String(doc.route)] ?? label(String(doc.route ?? 'General'))} inquiry`,
    route: doc.route ? String(doc.route) : null,
    name: String(doc.fullName ?? ''),
    email: String(doc.email ?? ''),
    status: String(doc.workState ?? 'new'),
    delivery: doc.deliveryState ? String(doc.deliveryState) : null,
    reference: doc.reference ? String(doc.reference) : null,
    createdAt: iso(doc.createdAt) ?? new Date(0).toISOString(),
    replyDueAt: iso(doc.slaDueAt),
    sourcePage: doc.attribution?.sourcePage ? String(doc.attribution.sourcePage) : null,
    marketingOptIn: typeof doc.consent?.marketingOptIn === 'boolean' ? doc.consent.marketingOptIn : null,
    details,
    attribution,
    notes: doc.internalNotes ? String(doc.internalNotes) : null,
  }
}

export function subscriptionToLead(doc: Record<string, any>): Lead {
  return {
    id: String(doc.id),
    type: 'newsletter',
    source: 'Newsletter signup',
    route: null,
    name: '',
    email: String(doc.email ?? ''),
    status: String(doc.state ?? 'pending-confirmation'),
    delivery: doc.confirmationSentAt ? 'confirmation sent' : null,
    reference: null,
    createdAt: iso(doc.createdAt) ?? new Date(0).toISOString(),
    replyDueAt: null,
    sourcePage: doc.sourcePage ? String(doc.sourcePage) : null,
    marketingOptIn: true,
    details: [
      { label: 'Consented at', value: iso(doc.consentedAt) ?? '' },
      { label: 'Confirmed at', value: iso(doc.confirmedAt) ?? '' },
      { label: 'Privacy policy version', value: String(doc.policyVersion ?? '') },
    ].filter((d) => d.value),
    attribution: {},
    notes: null,
  }
}

function dateRange(query: LeadQuery): Where[] {
  const clauses: Where[] = []
  if (query.from) clauses.push({ createdAt: { greater_than_equal: new Date(query.from).toISOString() } })
  if (query.to) {
    const end = new Date(query.to)
    end.setHours(23, 59, 59, 999)
    clauses.push({ createdAt: { less_than_equal: end.toISOString() } })
  }
  return clauses
}

const MAX_ROWS = 10_000

/** All leads matching the filters, newest first. */
export async function findLeads(query: LeadQuery, scope: LeadScope): Promise<Lead[]> {
  const leads: Lead[] = []
  const search = query.search?.trim().slice(0, 100)
  const wantInquiries = scope.canReadInquiries && query.type !== 'newsletter'
  const wantNewsletter = scope.canReadNewsletter && query.type !== 'inquiry' && !query.route

  if (wantInquiries) {
    const clauses: Where[] = dateRange(query)
    if (scope.routes) clauses.push({ route: { in: scope.routes.length ? scope.routes : ['__none__'] } })
    if (query.route) clauses.push({ route: { equals: query.route } })
    if (query.status) clauses.push({ workState: { equals: query.status } })
    if (search) clauses.push({ or: [{ fullName: { like: search } }, { email: { like: search } }, { reference: { like: search } }] })
    const result = await data.find({ collection: 'inquiries', where: clauses.length ? { and: clauses } : undefined, sort: '-createdAt', limit: MAX_ROWS, depth: 0, pagination: false })
    leads.push(...result.docs.map((d) => inquiryToLead(d as unknown as Record<string, any>)))
  }

  if (wantNewsletter) {
    const clauses: Where[] = dateRange(query)
    if (query.status) clauses.push({ state: { equals: query.status } })
    if (search) clauses.push({ email: { like: search } })
    const result = await data.find({
      collection: 'newsletter-subscriptions',
      where: clauses.length ? { and: clauses } : undefined,
      sort: '-createdAt',
      limit: MAX_ROWS,
      depth: 0,
      pagination: false,
    })
    leads.push(...result.docs.map((d) => subscriptionToLead(d as unknown as Record<string, any>)))
  }

  return leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function leadStats(all: Lead[]) {
  const now = Date.now()
  const day = 24 * 3600 * 1000
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const byRoute: Record<string, number> = {}
  for (const lead of all) if (lead.route) byRoute[lead.route] = (byRoute[lead.route] ?? 0) + 1
  return {
    total: all.length,
    today: all.filter((l) => Date.parse(l.createdAt) >= startOfToday.getTime()).length,
    last7Days: all.filter((l) => Date.parse(l.createdAt) >= now - 7 * day).length,
    inquiries: all.filter((l) => l.type === 'inquiry').length,
    newsletter: all.filter((l) => l.type === 'newsletter').length,
    awaitingReply: all.filter((l) => l.type === 'inquiry' && l.status === 'new').length,
    overdue: all.filter((l) => l.type === 'inquiry' && l.status === 'new' && l.replyDueAt && Date.parse(l.replyDueAt) < now).length,
    byRoute,
  }
}

// ------------------------------------------------------------------ export

const NAVY = 'FF0A1A2B'
const GOLD = 'FFC8A45B'
const GOLD_SOFT = 'FFF7F1E3'
const ZEBRA = 'FFF8F9FB'
const BORDER = 'FFE3E6EB'

const STATUS_FILL: Record<string, string> = {
  new: 'FFFFF4D6',
  acknowledged: 'FFE7F0FF',
  responded: 'FFE6F6EA',
  closed: 'FFEDEFF2',
  reclassified: 'FFF1E8FF',
  subscribed: 'FFE6F6EA',
  'pending-confirmation': 'FFFFF4D6',
  unsubscribed: 'FFFDECEC',
}

function title(text: string) {
  return text.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

function addTitle(sheet: ExcelJS.Worksheet, heading: string, subtitle: string, width: number) {
  sheet.mergeCells(1, 1, 1, width)
  const h = sheet.getCell(1, 1)
  h.value = heading
  h.font = { name: 'Calibri', size: 18, bold: true, color: { argb: GOLD } }
  h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  h.alignment = { vertical: 'middle', indent: 1 }
  sheet.getRow(1).height = 34

  sheet.mergeCells(2, 1, 2, width)
  const s = sheet.getCell(2, 1)
  s.value = subtitle
  s.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFD7DCE3' } }
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  s.alignment = { vertical: 'middle', indent: 1 }
  sheet.getRow(2).height = 20
  sheet.getRow(3).height = 6
}

function styleTable(sheet: ExcelJS.Worksheet, headerRow: number, columns: { header: string; width: number }[], rows: unknown[][], statusCol?: number) {
  const header = sheet.getRow(headerRow)
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.value = c.header
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D2B3D' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = { bottom: { style: 'medium', color: { argb: GOLD } } }
    sheet.getColumn(i + 1).width = c.width
  })
  header.height = 26

  rows.forEach((values, r) => {
    const row = sheet.getRow(headerRow + 1 + r)
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1)
      cell.value = value as ExcelJS.CellValue
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1B2430' } }
      cell.alignment = { vertical: 'top', wrapText: true, indent: 1 }
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      if (value instanceof Date) cell.numFmt = 'dd mmm yyyy, hh:mm'
    })
    if (statusCol !== undefined) {
      const raw = String(values[statusCol] ?? '').toLowerCase().replace(/ /g, '-')
      const fill = STATUS_FILL[raw]
      const cell = row.getCell(statusCol + 1)
      if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
      cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1B2430' } }
    }
    row.height = 20
  })

  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns.length } }
  sheet.views = [{ state: 'frozen', ySplit: headerRow, xSplit: 0, showGridLines: false }]
}

/** A branded workbook: Summary, All leads, one sheet of full inquiry answers, Newsletter. */
export async function buildLeadsWorkbook(leads: Lead[], filtersText: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Tel K. Ganesan — Admin'
  wb.created = new Date()
  const stamp = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const subtitle = `Exported ${stamp}${filtersText ? ` · Filters: ${filtersText}` : ''} · Confidential: contains personal data`

  // Summary
  const stats = leadStats(leads)
  const summary = wb.addWorksheet('Summary', { properties: { tabColor: { argb: GOLD } } })
  addTitle(summary, 'Tel K. Ganesan — Leads report', subtitle, 4)
  summary.getColumn(1).width = 30
  summary.getColumn(2).width = 14
  summary.getColumn(3).width = 4
  summary.getColumn(4).width = 40
  const kpis: [string, number][] = [
    ['Total leads', stats.total],
    ['Received today', stats.today],
    ['Last 7 days', stats.last7Days],
    ['Inquiries', stats.inquiries],
    ['Newsletter signups', stats.newsletter],
    ['Awaiting reply', stats.awaitingReply],
    ['Past reply deadline', stats.overdue],
  ]
  kpis.forEach(([name, value], i) => {
    const row = summary.getRow(5 + i)
    row.getCell(1).value = name
    row.getCell(2).value = value
    row.getCell(1).font = { name: 'Calibri', size: 11, color: { argb: 'FF3C4656' } }
    row.getCell(2).font = { name: 'Calibri', size: 14, bold: true, color: { argb: NAVY } }
    row.getCell(2).alignment = { horizontal: 'right' }
    for (const c of [1, 2]) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 ? 'FFFFFFFF' : GOLD_SOFT } }
      row.getCell(c).border = { bottom: { style: 'thin', color: { argb: BORDER } } }
    }
    row.height = 24
  })
  summary.getCell('D5').value = 'Inquiries by route'
  summary.getCell('D5').font = { name: 'Calibri', size: 11, bold: true, color: { argb: NAVY } }
  BASELINE_INQUIRY_ROUTES.forEach((r, i) => {
    const cell = summary.getCell(6 + i, 4)
    cell.value = `${r.label}: ${stats.byRoute[r.routeId] ?? 0}`
    cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF3C4656' } }
  })
  summary.views = [{ showGridLines: false }]

  // All leads
  const all = wb.addWorksheet('All leads', { properties: { tabColor: { argb: NAVY } } })
  const allCols = [
    { header: 'Received', width: 20 },
    { header: 'Form', width: 28 },
    { header: 'Name', width: 24 },
    { header: 'Email', width: 32 },
    { header: 'Status', width: 16 },
    { header: 'Reference', width: 20 },
    { header: 'Reply due', width: 20 },
    { header: 'Signed up on page', width: 24 },
    { header: 'Summary', width: 60 },
  ]
  addTitle(all, 'All leads', subtitle, allCols.length)
  styleTable(
    all,
    4,
    allCols,
    leads.map((l) => [
      new Date(l.createdAt),
      l.source,
      l.name,
      l.email,
      title(l.status),
      l.reference ?? '',
      l.replyDueAt ? new Date(l.replyDueAt) : '',
      l.sourcePage ?? '',
      l.details.map((d) => `${d.label}: ${d.value}`).join('\n').slice(0, 1500),
    ]),
    4,
  )

  // Inquiry answers, one column per question
  const inquiries = leads.filter((l) => l.type === 'inquiry')
  if (inquiries.length) {
    const questionLabels = Array.from(new Set(inquiries.flatMap((l) => l.details.map((d) => d.label))))
    const sheet = wb.addWorksheet('Inquiry answers', { properties: { tabColor: { argb: 'FF2271B1' } } })
    const cols = [
      { header: 'Received', width: 20 },
      { header: 'Reference', width: 20 },
      { header: 'Route', width: 24 },
      { header: 'Name', width: 24 },
      { header: 'Email', width: 32 },
      { header: 'Status', width: 16 },
      { header: 'Delivery', width: 14 },
      { header: 'Newsletter opt-in', width: 12 },
      ...questionLabels.map((q) => ({ header: q, width: Math.min(48, Math.max(18, q.length + 6)) })),
      { header: 'Internal notes', width: 40 },
    ]
    addTitle(sheet, 'Inquiry answers', subtitle, cols.length)
    styleTable(
      sheet,
      4,
      cols,
      inquiries.map((l) => {
        const answers = new Map(l.details.map((d) => [d.label, d.value]))
        return [
          new Date(l.createdAt),
          l.reference ?? '',
          l.source.replace(/ inquiry$/, ''),
          l.name,
          l.email,
          title(l.status),
          l.delivery ?? '',
          l.marketingOptIn ? 'Yes' : 'No',
          ...questionLabels.map((q) => answers.get(q) ?? ''),
          l.notes ?? '',
        ]
      }),
      5,
    )
  }

  // Newsletter
  const subs = leads.filter((l) => l.type === 'newsletter')
  if (subs.length) {
    const sheet = wb.addWorksheet('Newsletter', { properties: { tabColor: { argb: 'FF00A32A' } } })
    const cols = [
      { header: 'Signed up', width: 20 },
      { header: 'Email', width: 36 },
      { header: 'Status', width: 22 },
      { header: 'Signed up on page', width: 28 },
      { header: 'Confirmed at', width: 22 },
    ]
    addTitle(sheet, 'Newsletter subscribers', subtitle, cols.length)
    styleTable(
      sheet,
      4,
      cols,
      subs.map((l) => [
        new Date(l.createdAt),
        l.email,
        title(l.status),
        l.sourcePage ?? '',
        l.details.find((d) => d.label === 'Confirmed at')?.value ? new Date(l.details.find((d) => d.label === 'Confirmed at')!.value) : '',
      ]),
      2,
    )
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  // Neutralise spreadsheet formula injection from visitor-supplied text.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildLeadsCsv(leads: Lead[]): string {
  const header = ['Received', 'Form', 'Name', 'Email', 'Status', 'Reference', 'Reply due', 'Signed up on page', 'Details']
  const lines = leads.map((l) =>
    [l.createdAt, l.source, l.name, l.email, l.status, l.reference ?? '', l.replyDueAt ?? '', l.sourcePage ?? '', l.details.map((d) => `${d.label}: ${d.value}`).join(' | ')]
      .map(csvCell)
      .join(','),
  )
  // BOM so Excel opens UTF-8 (names with accents) correctly.
  return '﻿' + [header.join(','), ...lines].join('\r\n')
}
