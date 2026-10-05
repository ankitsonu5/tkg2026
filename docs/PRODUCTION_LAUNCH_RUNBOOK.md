# Production launch runbook (TKG website)

Closure standard (Tel, 4 Oct 2026): **complete = live + verified + accepted.** Fill every blank before
calling the site complete. Anything not yet proven stays explicitly open.

Target platform: **Vercel** (app + cron + Blob media) with **MongoDB Atlas** (a NEW production database).

## 0. What is already done in code

Security upgrades (next 16.3.8, payload 3.90.2), security headers, CSP in report-only mode, durable media
storage (Vercel Blob adapter, switches on when `BLOB_READ_WRITE_TOKEN` exists), cron config
(`vercel.json`, every 5 min), health endpoint `/api/health`, legacy-URL redirect engine, production seed
script, redirect import script, and the press kit withheld from the public site.

## 1. People (must be named)

| Role | Name | Date confirmed |
|---|---|---|
| Deployment owner | | |
| Rollback decision owner | | |
| Production acceptance owner | | |

Rollback rule (tick one): [ ] Vercel "Instant Rollback" to the previous deployment if any P0 live check fails, within ___ min  [ ] fix-forward within ___ h

## 2. Decisions and approvals only people can give

| Item | Owner | Done |
|---|---|---|
| Privacy policy text approved; version label chosen (e.g. `2026-10-v1`) | Legal / Tel | |
| Press kit: approved file supplied, then re-enable `DownloadButton` on Media page | Tel / Legal | |
| Each legacy URL in `docs/WP_REDIRECT_INVENTORY.csv` decided (301 / 410) | Tel / Ankit | |
| Route owners + backups named; written acceptance from each | Tel / Ankit | |
| Image rights cleared by an Evidence Reviewer (assets show publicly only when `Cleared`) | Evidence Reviewer | |
| Newsletter sending tool chosen (the site only collects subscribers) | Tel / Ankit | |

## 3. Infrastructure setup (accounts, ~1 hour)

1. **Atlas:** create a new project/cluster, database `tkg-production`, a dedicated DB user (readWrite on that DB only),
   network access allowing Vercel (0.0.0.0/0 with a strong password, or Vercel's IPs on a paid plan), backups ON (M10+ for
   continuous backup; the free M0 has none).
2. **Vercel:** import the GitHub repo; plan **Pro** (commercial use; also required for a 5-minute cron).
   Add a **Blob store** to the project (this creates `BLOB_READ_WRITE_TOKEN`).
3. **Environment variables** (Production). Set them BEFORE the first build, because `NEXT_PUBLIC_*` and canonicals are baked at build:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SERVER_URL`, `PRODUCTION_ORIGIN` | `https://telkganesan.com` (use the staging URL for the staging deploy) |
| `ALLOW_INDEXING` | `true` only at go-live; leave unset on staging |
| `DATABASE_URI` | Atlas production connection string |
| `PAYLOAD_SECRET` | new random 64-hex secret |
| `CRON_SECRET` | random secret (Vercel sends it as the cron Bearer token) |
| `SMTP_HOST/PORT/USER/PASSWORD`, `MAIL_FROM_ADDRESS/NAME` | real provider (ideally a domain sender, not a personal Gmail) |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | `G-Y8214D9PD5` |
| `BLOB_READ_WRITE_TOKEN` | created by the Blob store |

Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` on a server.

## 4. Provision the production database (once)

Point `DATABASE_URI` at the production database (locally, in a shell only), then:

```bash
npx tsx scripts/seed-production.ts --confirm-production \
  --admin-email <you> --admin-name "<Name>" \
  --primary <real owner mailbox> --backup <different real mailbox> \
  --accepted-by "<Name who accepted in writing>" \
  --owner-email <route owner login> --owner-name "<Name>" \
  --origin https://telkganesan.com --privacy-version <approved version>
```

It prints the generated passwords once. Re-running is safe (it never overwrites). Omit `--accepted-by` until
acceptance really exists; forms stay closed in production until it is recorded.

Then import the approved redirect decisions: `npx tsx scripts/import-redirects.ts` (dry run), then `--apply`.

## 5. Staging deploy first (no DNS change)

Deploy to the Vercel preview/production URL **without** `ALLOW_INDEXING`. Run section 7 there.
Only after staging passes, add the domain and switch DNS (keep the old WordPress backup + old DNS values for rollback).

## 6. GA4 console (one-time)

1. Admin -> Events -> mark **`form_submit`** as a **key event** (this is the conversion).
2. Register the custom dimensions listed in `receipts/pre-launch-audits-2026-10-01.md` section 7. Retention 14 months.

## 7. Live checks (record result + evidence link)

| Check | How | Result | Evidence |
|---|---|---|---|
| `/api/health` returns 200 | open it; add it to an uptime monitor | | |
| Form submit + validation, all 7 routes | submit each; confirm popup, owner + backup + sender emails | | |
| Email to at least 2 recipient domains | log: reference, recipients, timestamps, delay/failure | | |
| Newsletter double opt-in | subscribe, click confirm link from an external mailbox | | |
| Media upload | upload an image in Admin, confirm it persists after a redeploy | | |
| GA4 | accept consent; DebugView shows `page_view` and `form_submit` | | |
| robots / sitemap | `/robots.txt` Allow + sitemap line (only at go-live); sitemap lists all pages | | |
| Canonical + noindex | view-source on `/`, `/about`, `/search` | | |
| CSP report-only | browser console shows no unexpected violations; then switch the header to enforce | | |
| Legacy redirects | each decided old URL returns its 301/410 | | |
| Mobile / nav / search / CTA | real iPhone + Android + desktop Chrome/Safari/Edge | | |
| Lighthouse on the live URL | performance, accessibility, SEO | | |
| Backup restore drill | restore a backup into a scratch DB | | |
| Critical-defect review | no open S1/S2 | | |

## 8. Acceptance

Signed by acceptance owner: ______________  Date: ________ (only after section 7 is fully filled)

## 9. After go-live (first week)

Uptime monitor on `/api/health`, error tracking (e.g. Sentry), alert on failed deliveries (Admin -> Delivery Attempts, state `dead`),
switch CSP to enforcing, review npm audit monthly, rotate the shared admin passwords.
