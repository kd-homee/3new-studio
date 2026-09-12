# 3NEW Studio — XServer VPS Migration Handoff (Phase 1)

Status: **prepared, not deployed.** VPS access is currently locked out; nothing on the VPS, DNS, Vercel or
Supabase has been touched. Product direction: 3NEW Studio is an i-kana Business product candidate; Supabase
Auth retirement is a separate future Architecture/Gate decision (together with i-kana Account/Auth).

| Item | Value |
|---|---|
| Repository | `https://github.com/kd-homee/3new-studio` (public) |
| Production baseline | tag `pre-vps-migration-20260913` → `08ee2db50c940ca7ef15445b7f01677d2c9ebf12` (= Vercel Production deployment, state success, 2026-05-29) |
| Migration branch | `feat/xserver-vps-migration` (not merged) |

## 1. Current architecture

```
studio.3new.eu ─CNAME→ Vercel (XServer DNS: ns1–5.xserver.jp)
  └ Next.js 16.2.6 (App Router, proxy.ts auth gate, 3 API routes)
       ├ Supabase Auth only (Google OAuth + email/password, ALLOWED_EMAILS allowlist)
       ├ Anthropic (/api/minutes), OpenAI Whisper (/api/transcribe), Notion (/api/notion)
       └ Browser localStorage for editor autosave
```
No Supabase DB/Storage/Realtime/Edge Functions. No server-side persistent data.

## 2. Proposed Phase 1 architecture

```
studio.3new.eu → XServer DNS (A record → VPS)
  → XServer VPS Nginx (own vhost, TLS, 25m body, 300s timeout)
    → 127.0.0.1:<STUDIO_HOST_PORT>
      → isolated container "3new-studio" (Node 22, Next.js standalone, non-root, read-only FS)
        → existing Supabase Auth (unchanged)
```
Isolation: own directory, own `.env`, own compose project/network, own vhost + log files, no DB,
no shared credentials with Mayumi Chat or any other app.

## 3. Files changed on the branch

| File | Change |
|---|---|
| `next.config.ts` | `output: 'standalone'` |
| `Dockerfile` | Replaced static Nginx image with multi-stage Node 22 standalone image, non-root, healthcheck, required NEXT_PUBLIC build args (values never echoed in build logs) |
| `docker-compose.yml` | App-only service, `127.0.0.1` port, required-env guards (incl. `ALLOWED_EMAILS`), read-only FS, cap_drop, log rotation |
| `.dockerignore` | Excludes all `.env*`, docs, tests, untracked legacy files |
| `.env.example` | Names only; adds missing `OPENAI_API_KEY`, `STUDIO_HOST_PORT`; marks `SUPABASE_SERVICE_ROLE_KEY` unused |
| `nginx.conf` | Deleted (obsolete static-export config) |
| `app/api/transcribe/route.ts` | OpenAI client created lazily — `next build` no longer requires `OPENAI_API_KEY` (container build + likely CI failure cause) |
| `app/auth/callback/route.ts` | Redirect origin from forwarded headers — fixes redirect to `https://0.0.0.0:3000` behind Nginx (Google login would break on VPS) |
| `__tests__/auth/callback.test.ts` | New: origin behind proxy, failure path, local dev, unsafe `next` values |
| `lib/auth/guard.ts` | **Security hardening (approved):** `requireAllowedUser()` — valid Supabase user AND `ALLOWED_EMAILS`; 401/403; 503 fail-closed on missing config or Supabase failure |
| `app/api/transcribe`, `app/api/minutes`, `app/api/notion` routes | Call the guard first (transcribe: before reading the upload body) |
| `lib/auth/safeRedirect.ts` | `sanitizeNextPath()` — same-origin relative paths only |
| `app/auth/callback/route.ts`, `app/(auth)/login/page.tsx` | Sanitize `next` / `redirectTo`; URL-encode it in the OAuth callback URL |
| `__tests__/lib/auth/*`, `__tests__/api/*` | Guard + redirect regression tests; API routes test 401/403/503 |
| `.github/workflows/ci.yml` | Node 22; Docker job is build-only (stale `ghcr.io/3new-srl` push removed) |
| `README.md` | Removed stale static-export / `3new-srl` VPS instructions; points here |
| `deploy/xserver-vps/nginx/studio.3new.eu.conf.template` | Vhost template with placeholders |
| `deploy/xserver-vps/STAGING-CHECKLIST.md` | Staging verification |
| `deploy/xserver-vps/SECURITY-REVIEW.md` | `/api/transcribe` review + proposed (unimplemented) in-route allowlist check |

## 4. Verification performed locally (2026-09-13, Windows + Docker Desktop)

- After security hardening (commit following `4abf590`): `npm test` 17 suites / 100 tests passed;
  `tsc` only the 4 pre-existing test-file errors; `npm run build` OK; Docker smoke: healthy, all protected
  routes 307, unsafe `next` values stay on `https://studio.3new.eu`, no secrets in build log.
- Initial preparation (`4abf590`): `npm test`: 15 suites / 53 tests passed (baseline main: 14 / 50).
- `npx tsc --noEmit`: 4 errors, all pre-existing on `main` in `__tests__/api/notion.test.ts` and
  `__tests__/api/transcribe/route.test.ts` (test typing only; `next build` type check passes).
- `npm run build`: success, `.next/standalone/server.js` produced.
- `docker compose up --build`: image 316 MB, `healthy`, user `node`, read-only root FS, port `127.0.0.1` only,
  json-file rotation 10m×5, no `.env*` inside image, build log contains no Supabase URL/JWT.
- Build without NEXT_PUBLIC args → fails with explicit error (fail closed).
- Container: unauthenticated `/`, all 8 `/tools/*`, all 3 `/api/*` (GET and POST) → 307 to login;
  `x-middleware-subrequest` bypass attempt → 307.
- Nginx template (nginx 1.27.5, self-signed cert, placeholders filled with test values): `nginx -t` OK;
  HTTP→HTTPS 301; HSTS header; `/auth/callback/` → `https://studio.3new.eu/login?error=auth_failed`;
  20 MB unauthenticated POST reaches app (307); 27 MB → 413.
- **Not verified locally** (needs staging): real Google/email login round-trip, Whisper/Claude/Notion calls.

## 5. Blocked on VPS access (exact items)

1. VPS OS, CPU/RAM/disk headroom; Docker Engine + Compose plugin presence/version.
2. Whether Nginx runs on the host or in a container, its version (`http2 on;` needs ≥ 1.25.1), include layout,
   and existing `server_name`s (no collision with `studio.3new.eu`).
3. Free localhost port for `STUDIO_HOST_PORT`.
4. Certificate tooling (certbot? webroot vs nginx plugin) → fill `__ACME_WEBROOT__`, cert paths, `__LOG_DIR__`.
5. Firewall: XServer panel packet filter + host firewall allow 80/443 (and do NOT expose the app port).
6. App directory location convention (e.g. `/opt/3new-studio`) and deploy user/permissions.
7. VPS public IPv4 (and IPv6, if any) for the future A/AAAA record.

Also needs approval (not VPS-bound):
- Staging hostname (proposed: `staging.studio.3new.eu`) DNS record in XServer DNS (DNS change; not created yet).
- Adding the staging URL to Supabase Auth Redirect URLs (Supabase config change) for Google login on staging.
- Source of `.env` values: copy from Vercel project env (Production) or issue new 3NEW-Studio-specific keys.
- **TLS for cutover:** `studio.3new.eu` already sends HSTS, so the VPS must present a valid certificate the
  moment DNS switches. HTTP-01 cannot validate before DNS points to the VPS → decide DNS-01 (TXT
  `_acme-challenge.studio` in XServer DNS) or another pre-issuance method.

## 6. First read-only VPS inspection (proposed commands — no changes)

Run only after the lockout is resolved via the XServer panel. Do not paste output containing secrets.

```bash
# identity & resources
whoami; id; hostnamectl; cat /etc/os-release | head -4; nproc; free -h; df -h /
ip -brief addr

# docker
docker version --format '{{.Server.Version}}'; docker compose version
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'

# listening ports (find a free localhost port; confirm nothing on 80/443 besides nginx)
sudo ss -ltnp

# web server layout
systemctl list-units --type=service --state=running | grep -Ei 'nginx|apache|httpd|caddy|docker'
nginx -v
ls -la /etc/nginx/ /etc/nginx/conf.d/ /etc/nginx/sites-enabled/ 2>/dev/null
sudo nginx -T 2>/dev/null | grep -E '^\s*(server_name|listen|include|ssl_certificate)\b' | sort | uniq -c

# TLS tooling
certbot --version 2>/dev/null; sudo certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'

# firewall (host side; also check XServer panel packet filter)
sudo ufw status verbose 2>/dev/null || sudo firewall-cmd --list-all 2>/dev/null || sudo iptables -S | head -30

# directory conventions
ls -la /opt /srv /var/www 2>/dev/null
```

## 7. Deployment outline (after preflight + approval)

```bash
sudo mkdir -p /opt/3new-studio && sudo chown <deploy-user> /opt/3new-studio   # path to be confirmed
git clone --branch feat/xserver-vps-migration https://github.com/kd-homee/3new-studio.git /opt/3new-studio
cd /opt/3new-studio && cp .env.example .env && chmod 600 .env                  # fill values
docker compose up --build -d && docker compose ps
# render the vhost template for the STAGING hostname first, nginx -t, reload, then run STAGING-CHECKLIST.md
```

## 8. Rollback strategy

- **Before DNS cutover:** production is untouched on Vercel. Rollback = `docker compose down` and remove the
  staging vhost; no user impact.
- **DNS cutover:** record the current `studio.3new.eu` CNAME target and lower its TTL (e.g. 300 s) at least one
  TTL period beforehand. Rollback = restore the CNAME to the recorded Vercel target. Keep the Vercel project,
  its domain assignment and env vars intact throughout observation.
- **Application on VPS:** redeploy a previous commit (`git checkout <tag> && docker compose up --build -d`);
  baseline code is tag `pre-vps-migration-20260913`.
- **Auth:** Supabase Auth is shared by Vercel and VPS during Phase 1, so rolling back does not affect accounts
  (users may need to log in again because cookies are per host).
- Supabase and Vercel are retired only after the observation window and a separate approval.
