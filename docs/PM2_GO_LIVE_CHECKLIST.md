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

### B1. This server already hosts other sites — check before deploying
This box is shared, so the new app must not take a port or a server_name something else is using.

- [ ] **Find a free port.** List what is listening:
      `sudo ss -tlnp | sort -t: -k2 -n`
      Pick a port nothing holds (e.g. 3015), then set `APP_PORT=3015` in `.env` **and** the
      `upstream tkg_app` block in `deploy/nginx-telkganesan.conf`. Both must match.
      `deploy/deploy.sh` refuses to start if the port is taken by a foreign process.
- [ ] **Check the domain is not already claimed** by another vhost:
      `grep -rn "server_name" /etc/nginx/sites-enabled/ | grep -i telkganesan`
      If the old WordPress site is served from this same nginx, its config must be disabled
      or edited at cutover — two enabled blocks with the same `server_name` means nginx
      silently uses the first and ignores the other.
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

## E. Cutover
- [ ] Lower DNS TTL a day before; point `telkganesan.com` and `www` to the server.
- [ ] Set `NEXT_PUBLIC_SERVER_URL` / `PRODUCTION_ORIGIN` to the live domain and add `ALLOW_INDEXING=true`, then redeploy (rebuild is required).
- [ ] Check `/robots.txt`, `/sitemap.xml`, canonical tags show `https://telkganesan.com`.
- [ ] Submit sitemap in Google Search Console; confirm GA4 Real-time.
- [ ] Review browser console for CSP report-only messages, then decide on enforcing CSP.

## F. Notes
- No cron configured: failed inquiry emails are not retried automatically. Check inquiries in admin. To enable later: set `CRON_SECRET` and call `/api/cron/deliver` every 5 minutes with `Authorization: Bearer <secret>`.
- Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` on the server.
