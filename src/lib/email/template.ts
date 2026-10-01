/**
 * Shared branded HTML email shell. Table layout with inline styles so it renders in Gmail
 * and Outlook. Every dynamic value must go through `esc` before it is placed in markup.
 */
export const NAVY = '#0b1a2e'
export const GOLD = '#c9a66b'
export const INK = '#1b2433'
export const MUTED = '#6b7686'
export const LINE = '#e6e1d6'
export const PAPER = '#f6f3ec'

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** camelCase / snake_case key -> "Camel case" label. */
export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export function formatDue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return (
    date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Detroit',
    }) + ' ET'
  )
}

export function detailRows(entries: [string, unknown][]): string {
  return entries
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${LINE};width:34%;vertical-align:top;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};">${esc(humanize(k))}</td>
          <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${LINE};vertical-align:top;font-size:15px;line-height:1.55;color:${INK};white-space:pre-wrap;">${esc(v)}</td>
        </tr>`,
    )
    .join('')
}

export function layout(args: {
  preheader: string
  eyebrow: string
  title: string
  body: string
  footer: string
}): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(args.title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(args.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAPER};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;">
      <tr><td style="background:${NAVY};padding:28px 36px 26px;">
        <div style="font-size:22px;color:#ffffff;letter-spacing:.01em;">Tel K. Ganesan</div>
        <div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${GOLD};">Executive Chairman &nbsp;|&nbsp; Enterprise Builder &nbsp;|&nbsp; Investor &nbsp;|&nbsp; Producer</div>
      </td></tr>
      <tr><td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:36px 36px 8px;font-family:Arial,Helvetica,sans-serif;">
        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${GOLD};font-weight:bold;">${esc(args.eyebrow)}</div>
        <div style="margin-top:10px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${NAVY};">${esc(args.title)}</div>
      </td></tr>
      <tr><td style="padding:12px 36px 36px;font-family:Arial,Helvetica,sans-serif;">${args.body}</td></tr>
      <tr><td style="background:${PAPER};padding:20px 36px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};border-top:1px solid ${LINE};">${args.footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}
