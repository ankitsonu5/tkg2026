# PM2 go-live checklist (telkganesan.com)

Files: `ecosystem.config.cjs`, `deploy/nginx-telkganesan.conf`, `deploy/deploy.sh`.
Env variable list: see `.env.example` and `docs/PRODUCTION_LAUNCH_RUNBOOK.md`.

## A. Before touching the server
- [ ] New Atlas password, new Gmail app password, new `PAYLOAD_SECRET` (old ones were exposed in chat/screenshots).
- [ ] Atlas > Network Access: add the server's public IP.
- [ ] Strong passwords for every Payload admin user.
- [ ] Privacy policy approved by Tel/Legal (DB status is `draft-unapproved`).
- [ ] All inquiry routes marked accepted; primary and backup mailboxes are different addresses.

## B. Server setup (once)
- [ ] Ubuntu with Node 20+, nginx, certbot, git, pm2 (`npm i -g pm2`), 2 GB RAM or swap.
- [ ] Firewall: allow 80/443 (and SSH) only. The app port stays closed (it binds 127.0.0.1).
- [ ] Clone repo, create `.env` (production values, `NEXT_PUBLIC_SERVER_URL=https://...`).
      Staging first: staging URL and **no** `ALLOW_INDEXING`.
- [ ] Copy nginx config, issue certificate, `nginx -t && systemctl reload nginx`.
- [ ] `bash deploy/deploy.sh`, then `pm2 startup` (run the command it prints) and `pm2 save`.
- [ ] Backup: daily copy of the `media/` folder (uploads live there) and Atlas backups on.

### B1. This server already hosts other sites — surveyed 10 Oct 2026
18 PM2 processes, ~11 projects (agaos, atl-distribution, dndcraft, hms, hospital,
lab, mom, muga, pagecraft, preva, track). Findings below are from that survey; re-check
if time has passed.

- [x] **Port.** `sudo ss -tlnp` showed **3000 already taken** by another `next-server`.
      Also in use: 3001, 3004–3008, 4000–4002, 4046, 4800, 4801, 5100, 5200, 5300,
      5432 (postgres), 8000, 8010, 27017 (mongod).
      **Chosen port: 3015** (free). It is the default in `ecosystem.config.cjs` and in both
      nginx `upstream` blocks; set `APP_PORT=3015` in `.env` too.
      `deploy/deploy.sh` aborts if the port is held by a foreign process.
- [x] **RAM is not a constraint.** `free -m`: 24 GB total, ~21 GB available, all 18 apps
      together use ~2.2 GB. The build's 8 GB ceiling fits comfortably. Swap is 0, so an
      OOM would be abrupt rather than slow — but there is ample headroom.
- [ ] **Not ours, worth a look:** `preva-backend` shows 169+ restarts while every other app
      sits at 35–40 (which look like server reboots). That one may be crash-looping —
      `pm2 logs preva-backend --lines 100`.
- [x] **No vhost on this server claims telkganesan.com** (grep over `sites-enabled` was
      empty). The old WordPress is on a different machine — `telkganesan.com` resolves to
      `35.206.66.63` (Google Cloud), this VPS is Contabo. So there is no nginx conflict.
      Re-verify across all includes before cutover: `sudo nginx -T | grep -i "server_name.*telkganesan"`
- [ ] **Do not add `default_server`** in this config. The blocks are name-based and only
      answer for telkganesan.com; the other sites keep working untouched.
- [ ] **Always validate before reloading:** `sudo nginx -t && sudo systemctl reload nginx`.
      A reload (not restart) keeps the other sites serving. If `nginx -t` fails, nothing is
      applied, so fix it before reloading.
- [ ] **Certificate covers only this domain:** `sudo certbot --nginx -d telkganesan.com -d www.telkganesan.com`
      does not touch the other sites' certificates.
- [ ] **PM2 already runs other apps?** `pm2 list` first. `pm2 startOrReload ecosystem.config.cjs`
      only touches the app named `tkg`. But `pm2 save` snapshots **all** processes, so make sure
      the others are in the state you want before saving.
- [ ] **RAM:** `max_memory_restart` is 900M for this app alone. With several Node apps on one
      box, check `free -m` and total PM2 memory (`pm2 list`) so the build (which can use up to
      8 GB via `--max-old-space-size`) does not OOM the other sites. If RAM is tight, build
      elsewhere or lower that limit in `package.json`.

## B2. Staging on new.telkganesan.com (do this first)

DNS is managed at **Cloudflare** (`lex` / `gabriella` .ns.cloudflare.com). The apex stays on
the old WordPress; only a new subdomain points here.

- [ ] Get this server's public IP: `curl -4 ifconfig.me`
- [ ] Cloudflare: add `new.telkganesan.com` → **A** → that IP, **DNS-only (grey cloud)**.
      Leave the apex record alone.
- [ ] `.env` on the server:
      `APP_PORT=3015`,
      `NEXT_PUBLIC_SERVER_URL=https://new.telkganesan.com`,
      `PRODUCTION_ORIGIN=https://new.telkganesan.com`,
      and **no `ALLOW_INDEXING`** (staging must not be indexed).
- [ ] Certificate — nginx will not start referencing a cert that does not exist yet, and
      certbot cannot validate until nginx answers on :80, so bootstrap in order
      (the exact three steps are in the header of `deploy/nginx-new-staging.conf`):
      minimal :80 block → `certbot certonly --webroot` → full config → `nginx -t` → reload.
- [ ] `bash deploy/deploy.sh`
- [ ] Confirm `https://new.telkganesan.com/api/health` returns JSON (not the WordPress page).
- [ ] Confirm `/robots.txt` says `Disallow: /` and responses carry `X-Robots-Tag: noindex`.

## C. Staging checks (no indexing)
- [ ] Every page loads over https, no mixed-content or console errors.
- [ ] Submit one real inquiry: owner and backup mailboxes both receive it.
- [ ] Newsletter signup: confirm link points to the https domain.
- [ ] Upload an image in admin, confirm it shows on the site and survives `pm2 restart tkg`.
- [ ] Confirm the other sites on this server still load after the nginx reload.
- [ ] GA4 Real-time shows the visit only after accepting analytics.

## D. Content sign-off (Tel)
- [ ] Home chips "Vision 2030" / "Urban Tech" approved or removed.
- [ ] "24h Response SLA" badge: use the approved response-time number or remove it.
- [ ] Image rights for `tel1` verified.
- [ ] Redirect decisions made, then import `docs/WP_REDIRECT_INVENTORY.csv` (`scripts/import-redirects.ts`).

## E. Cutover (only after C and D are complete)

**Decide `www` first.** As of 10 Oct 2026 `www.telkganesan.com` has **no DNS record at all**
(no A, AAAA or CNAME). certbot validates every `-d` together, so
`certbot -d telkganesan.com -d www.telkganesan.com` **fails outright** while that is true.
Either create the www record in Cloudflare, or drop www from the certbot command **and**
delete the www server block in `deploy/nginx-telkganesan.conf`.

- [ ] Lower the apex DNS TTL a day before (Cloudflare).
- [ ] Back up the old WordPress and record its current DNS values (apex A `35.206.66.63`)
      so rollback is a DNS change, not a rebuild.
- [ ] Cloudflare: apex `A` → this server's IP (DNS-only). Add `www` now if you decided to keep it.
- [ ] Issue the live certificate — only possible *after* the DNS change, because HTTP-01 is
      answered by whatever the domain currently resolves to:
      `sudo certbot certonly --webroot -w /var/www/certbot -d telkganesan.com` (+ `-d www...` if it exists)
- [ ] `.env`: `NEXT_PUBLIC_SERVER_URL` and `PRODUCTION_ORIGIN` → `https://telkganesan.com`,
      add `ALLOW_INDEXING=true`.
- [ ] **Rebuild** — `NEXT_PUBLIC_*` and canonicals are baked at build time, so a restart alone
      is not enough: `bash deploy/deploy.sh`
- [ ] Enable `deploy/nginx-telkganesan.conf`, then `sudo nginx -t && sudo systemctl reload nginx`.
      Reload, not restart, so the other ~11 sites keep serving.
- [ ] Check `/robots.txt`, `/sitemap.xml` and canonical tags all show `https://telkganesan.com`.
- [ ] Confirm the other sites on this server still respond.
- [ ] Decide what happens to `new.telkganesan.com`: keep it as staging (still noindex) or
      retire the record. Do not leave it serving the same content as the live site while
      indexable — that is duplicate content.
- [ ] Submit sitemap in Google Search Console; confirm GA4 Real-time.
- [ ] Review browser console for CSP report-only messages, then decide on enforcing CSP.

## F. Notes
- No cron configured: failed inquiry emails are not retried automatically. Check inquiries in admin. To enable later: set `CRON_SECRET` and call `/api/cron/deliver` every 5 minutes with `Authorization: Bearer <secret>`.
- Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` on the server.
