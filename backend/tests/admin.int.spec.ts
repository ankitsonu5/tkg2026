import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { hashPassword } from '../src/admin/auth'
import { createApp } from '../src/app'
import { User } from '../src/models'
import { testDb, uid } from './helpers'

/**
 * Admin panel API: authentication, role rules and the main write paths, exercised over HTTP
 * against the isolated test database.
 */
describe('Admin API', () => {
  let server: Server
  let base: string
  const password = 'correct-horse-battery'
  const adminEmail = `${uid('admin')}@localhost.test`
  const editorEmail = `${uid('editor')}@localhost.test`

  beforeAll(async () => {
    await testDb()
    await User.create({ email: adminEmail, name: 'Test Admin', roles: ['administrator'], ...(await hashPassword(password)) })
    await User.create({ email: editorEmail, name: 'Test Editor', roles: ['editor'], ...(await hashPassword(password)) })
    server = createApp().listen(0)
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/admin`
  })

  afterAll(() => {
    server?.close()
  })

  async function loginAs(email: string, pw = password) {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: pw }),
    })
    const cookie = res.headers.get('set-cookie')?.split(';')[0] ?? ''
    return { res, cookie }
  }

  function api(cookie: string) {
    return async (path: string, init: { method?: string; body?: unknown } = {}) => {
      const res = await fetch(`${base}${path}`, {
        method: init.method ?? 'GET',
        headers: { cookie, ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      return { status: res.status, body: (await res.json()) as any }
    }
  }

  it('ADMIN-01: rejects anonymous requests and wrong passwords', async () => {
    expect((await fetch(`${base}/dashboard`)).status).toBe(401)
    const { res } = await loginAs(adminEmail, 'wrong-password-123')
    expect(res.status).toBe(401)
  })

  it('ADMIN-02: logs in with a Payload-format password hash and never returns secrets', async () => {
    const { res, cookie } = await loginAs(adminEmail)
    expect(res.status).toBe(200)
    expect(cookie).toMatch(/^tkg_admin=/)
    const call = api(cookie)
    const me = await call('/auth/me')
    expect(me.body.user.email).toBe(adminEmail)
    expect(me.body.isAdmin).toBe(true)
    const users = await call(`/collections/users?search=${encodeURIComponent(adminEmail)}`)
    expect(users.body.docs[0].email).toBe(adminEmail)
    expect(users.body.docs[0].hash).toBeUndefined()
    expect(users.body.docs[0].salt).toBeUndefined()
  })

  it('ADMIN-03: an editor can write a draft but cannot publish or manage users', async () => {
    const call = api((await loginAs(editorEmail)).cookie)
    const slug = uid('post')
    const draft = await call('/collections/articles', {
      method: 'POST',
      body: { title: 'Editor draft', slug, topic: 'leadership', authorshipStatus: 'authored', _status: 'draft' },
    })
    expect(draft.status).toBe(201)
    expect(typeof draft.body.seoAnalysis?.score).toBe('number')

    const publish = await call(`/collections/articles/${draft.body.id}`, { method: 'PATCH', body: { _status: 'published' } })
    expect(publish.status).toBe(403)

    expect((await call('/collections/users')).status).toBe(403)
    expect((await call('/globals/site-settings', { method: 'PUT', body: { siteName: 'x' } })).status).toBe(403)
  })

  it('ADMIN-04: an administrator can publish content that passes the evidence gate, and edits are audited', async () => {
    const call = api((await loginAs(adminEmail)).cookie)
    const created = await call('/collections/articles', {
      method: 'POST',
      body: { title: 'Admin post', slug: uid('admin-post'), topic: 'leadership', authorshipStatus: 'authored', _status: 'published' },
    })
    expect(created.status).toBe(201)
    expect(created.body._status).toBe('published')

    const audit = await call(`/collections/audit-events?where=${encodeURIComponent(JSON.stringify({ subjectId: { equals: created.body.id } }))}`)
    expect(audit.body.docs.some((e: { event: string }) => e.event === 'admin.create')).toBe(true)
  })

  it('ADMIN-05: unresolved authorship blocks publication even for an administrator', async () => {
    const call = api((await loginAs(adminEmail)).cookie)
    const blocked = await call('/collections/articles', {
      method: 'POST',
      body: { title: 'Unverified', slug: uid('unverified'), topic: 'leadership', authorshipStatus: 'unresolved', _status: 'published' },
    })
    expect(blocked.status).toBe(422)
    expect(blocked.body.error).toMatch(/evidence gate/i)
  })

  it('ADMIN-12: custom pages get a clean, unique path that cannot shadow a built-in page', async () => {
    const call = api((await loginAs(adminEmail)).cookie)
    const title = `Speaking Fees ${uid('t')}`
    const created = await call('/collections/pages', {
      method: 'POST',
      body: { title, pageId: '', path: '', seoAnalysis: { focusKeyword: 'speaking fees' }, _status: 'draft' },
    })
    expect(created.status).toBe(201)
    expect(created.body.path).toMatch(/^\/speaking-fees-t-[a-z0-9-]+$/)
    expect(created.body.pageId ?? null).toBeNull()

    const duplicate = await call('/collections/pages', { method: 'POST', body: { title: 'Copy', path: created.body.path } })
    expect(duplicate.status).toBe(422)
    expect(duplicate.body.error).toMatch(/already uses the path/)

    const reserved = await call(`/collections/pages/${created.body.id}`, { method: 'PATCH', body: { path: '/about/team' } })
    expect(reserved.status).toBe(422)
    expect(reserved.body.error).toMatch(/built-in page/)

    const renamed = await call(`/collections/pages/${created.body.id}`, { method: 'PATCH', body: { path: 'Events/Summit 2027' } })
    expect(renamed.status).toBe(200)
    expect(renamed.body.path).toBe('/events/summit-2027')
  })

  it('ADMIN-06: uploads an image, generates sizes, and removes the files on delete', async () => {
    const { cookie } = await loginAs(adminEmail)
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#c8a45b' } }).png().toBuffer()
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'Test Upload.png')
    form.append('alt', 'Gold test swatch')
    const res = await fetch(`${base}/media`, { method: 'POST', headers: { cookie }, body: form })
    const asset = (await res.json()) as any
    expect(res.status).toBe(201)
    expect(asset.filename).toMatch(/^test-upload(-\d+)?\.png$/)
    expect(asset.width).toBe(800)
    expect(asset.sizes.thumbnail.width).toBe(400)
    expect(asset.sizes.hero.filename).toBeNull()
    expect(asset.rightsStatus).toBe('unverified')

    const del = await api(cookie)(`/collections/assets/${asset.id}`, { method: 'DELETE' })
    expect(del.status).toBe(200)
  })

  it('ADMIN-08: lists every form submission as a lead and exports Excel and CSV', async () => {
    const { Inquiry, NewsletterSubscription } = await import('../src/models')
    const email = `${uid('lead')}@localhost.test`
    await Inquiry.create({
      reference: uid('REF'),
      route: 'speaking',
      fullName: '=HYPERLINK("http://evil")',
      email,
      qualification: { event: 'Leadership Summit', format: 'keynote' },
      workState: 'new',
      deliveryState: 'pending',
    })
    await NewsletterSubscription.create({ email: `news-${email}`, state: 'subscribed', consentedAt: new Date(), policyVersion: 'v1' })

    const { cookie } = await loginAs(adminEmail)
    const call = api(cookie)
    const leads = await call(`/leads?search=${encodeURIComponent(email)}`)
    expect(leads.status).toBe(200)
    expect(leads.body.docs.map((l: { type: string }) => l.type).sort()).toEqual(['inquiry', 'newsletter'])
    const inquiry = leads.body.docs.find((l: { type: string }) => l.type === 'inquiry')
    expect(inquiry.source).toBe('Speaking inquiry')
    expect(inquiry.details).toContainEqual({ label: 'Format', value: 'Keynote' })
    expect(leads.body.stats.total).toBeGreaterThanOrEqual(2)

    const xlsx = await fetch(`${base}/leads/export?format=xlsx&search=${encodeURIComponent(email)}`, { headers: { cookie } })
    expect(xlsx.status).toBe(200)
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml')
    const bytes = new Uint8Array(await xlsx.arrayBuffer())
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')

    const csv = await (await fetch(`${base}/leads/export?format=csv&search=${encodeURIComponent(email)}`, { headers: { cookie } })).text()
    // Visitor text that looks like a spreadsheet formula is neutralised.
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`)

    const editor = api((await loginAs(editorEmail)).cookie)
    expect((await editor('/leads')).status).toBe(403)
  })

  it('ADMIN-09: five failed logins from one IP block that IP (any username) with a countdown', async () => {
    const attempt = (ip: string, email: string, pw: string) =>
      fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ email, password: pw }),
      })
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`
    const left: number[] = []
    for (let i = 0; i < 4; i++) {
      const res = await attempt(ip, `${uid('nobody')}@localhost.test`, 'wrong-password')
      expect(res.status).toBe(401)
      left.push(((await res.json()) as { attemptsLeft: number }).attemptsLeft)
    }
    expect(left).toEqual([4, 3, 2, 1])
    const fifth = await attempt(ip, `${uid('nobody')}@localhost.test`, 'wrong-password')
    expect(fifth.status).toBe(429)
    const body = (await fifth.json()) as { retryAfterSeconds: number }
    expect(body.retryAfterSeconds).toBeGreaterThan(20)
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(30)

    // Even the right password is refused while the IP is blocked...
    expect((await attempt(ip, adminEmail, password)).status).toBe(429)
    // ...but another client is unaffected.
    expect((await attempt('198.51.100.7', adminEmail, password)).status).toBe(200)
  })

  it('ADMIN-10: lost password — emailed 6-digit code resets the password and signs out old sessions', async () => {
    const { data } = await import('../src/data/client')
    const resetEmail = `${uid('reset')}@localhost.test`
    const username = uid('resetuser').toLowerCase()
    await User.create({ email: resetEmail, username, name: 'Reset Person', roles: ['editor'], ...(await hashPassword('old-password-1')) })
    const oldSession = (await loginAs(resetEmail, 'old-password-1')).cookie
    expect((await api(oldSession)('/auth/me')).status).toBe(200)

    const sent: Array<{ to: string; subject: string; text: string }> = []
    const original = data.sendEmail
    data.sendEmail = (async (message: { to: string; subject: string; text: string }) => {
      sent.push(message)
      return { accepted: [message.to], rejected: [], messageId: '<reset>' }
    }) as typeof data.sendEmail
    try {
      const post = (path: string, body: unknown) =>
        fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.44' }, body: JSON.stringify(body) })

      // Unknown accounts get the same answer and no email.
      const unknown = await post('/auth/forgot', { login: 'no-such-user' })
      expect(unknown.status).toBe(200)
      expect(sent).toHaveLength(0)

      const forgot = await post('/auth/forgot', { login: username })
      expect(forgot.status).toBe(200)
      expect(sent).toHaveLength(1)
      expect(sent[0].to).toBe(resetEmail)
      const code = sent[0].text.match(/\b(\d{6})\b/)![1]

      const wrong = await post('/auth/reset', { login: username, code: code === '000000' ? '111111' : '000000', password: 'brand-new-pass' })
      expect(wrong.status).toBe(400)
      expect(((await wrong.json()) as { error: string }).error).toMatch(/4 tries left/)

      const ok = await post('/auth/reset', { login: username, code, password: 'brand-new-pass' })
      expect(ok.status).toBe(200)
      // The code is single use.
      expect((await post('/auth/reset', { login: username, code, password: 'another-pass-1' })).status).toBe(400)
    } finally {
      data.sendEmail = original
    }

    expect((await api(oldSession)('/auth/me')).status).toBe(401)
    expect((await loginAs(resetEmail, 'old-password-1')).res.status).toBe(401)
    expect((await loginAs(username, 'brand-new-pass')).res.status).toBe(200)
  })

  it('ADMIN-11: replying to a lead sends the email through the site and marks the inquiry responded', async () => {
    const { data } = await import('../src/data/client')
    const { Inquiry } = await import('../src/models')
    const to = `${uid('reply')}@localhost.test`
    const inquiry = await Inquiry.create({ reference: uid('REF'), route: 'general', fullName: 'Reply Person', email: to, qualification: { request: 'Hi' }, workState: 'new' })

    const sent: Array<{ to: string; subject: string; text: string; html: string }> = []
    const original = data.sendEmail
    data.sendEmail = (async (message: { to: string; subject: string; text: string; html: string }) => {
      sent.push(message)
      return { accepted: [message.to], rejected: [], messageId: '<reply-1>' }
    }) as typeof data.sendEmail
    try {
      const call = api((await loginAs(adminEmail)).cookie)
      const res = await call(`/leads/inquiry/${inquiry._id}/reply`, { method: 'POST', body: { subject: 'Re: your request', message: 'Hello <b>there</b>\nThanks!' } })
      expect(res.status).toBe(200)
      expect(res.body.lead.status).toBe('responded')
      expect(res.body.lead.notes).toMatch(/replied by email: "Re: your request"/)
      expect(sent[0].to).toBe(to)
      // Staff text is escaped in the HTML version.
      expect(sent[0].html).toContain('Hello &lt;b&gt;there&lt;/b&gt;')

      const empty = await call(`/leads/inquiry/${inquiry._id}/reply`, { method: 'POST', body: { subject: 'x', message: '' } })
      expect(empty.status).toBe(400)
    } finally {
      data.sendEmail = original
    }
    const editor = api((await loginAs(editorEmail)).cookie)
    expect((await editor(`/leads/inquiry/${inquiry._id}/reply`, { method: 'POST', body: { subject: 'x', message: 'yo' } })).status).toBe(403)
  })

  it('ADMIN-07: refuses state-changing requests from another origin', async () => {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ email: adminEmail, password }),
    })
    expect(res.status).toBe(403)
  })
})
