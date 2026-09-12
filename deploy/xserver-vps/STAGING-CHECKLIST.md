# 3NEW Studio — Staging Verification Checklist (Phase 1)

Run against the **staging hostname** on the XServer VPS before any DNS change for `studio.3new.eu`.
Record date, tester, image/commit SHA and result (✅ / ❌ + note) for every line.

Prerequisites:
- Container `3new-studio` is `healthy` (`docker compose ps`).
- Staging vhost has a valid certificate.
- For Google login on staging, the staging URL must be in Supabase Auth → URL Configuration → Redirect URLs.
  **This is a Supabase configuration change and needs explicit approval**; without it, test email/password only.
- Test accounts: one address in `ALLOWED_EMAILS`, one Supabase-authenticable address that is **not** in it.

## 1. Boot & infrastructure
- [ ] `docker compose ps` → `healthy`; `docker inspect` shows port bound to `127.0.0.1` only
- [ ] Port is NOT reachable from outside the VPS (`curl http://<vps-public-ip>:<STUDIO_HOST_PORT>/` from a remote host fails)
- [ ] `http://<staging>/` → 301 to `https://`
- [ ] HTTPS certificate valid for the staging hostname; `Strict-Transport-Security` header present

## 2. Login & access control
- [ ] Logged out: `/`, every `/tools/*`, every `/api/*` → 307 to `/login/?redirectTo=...`
- [ ] `/login/` and `/access-denied/` → 200
- [ ] Email/password login with allowed account → lands on `redirectTo` target
- [ ] Google login with allowed account → returns to staging host (not production) and lands on target
- [ ] Non-allowed account → `/access-denied/`, and all `/tools/*` + `/api/*` still refused
- [ ] Logout from sidebar → protected routes redirect to login again
- [ ] `/auth/callback/` without `code` → redirect to `https://<staging>/login?error=auth_failed` (correct scheme + host)

## 3. Tool routes (logged in, allowed account) — each returns 200 and renders
- [ ] `/tools/markdown/`
- [ ] `/tools/yaml/`
- [ ] `/tools/json/`
- [ ] `/tools/html/`
- [ ] `/tools/password/`
- [ ] `/tools/image-resize/`
- [ ] `/tools/format-converter/`
- [ ] `/tools/minutes/`

## 4. Markdown & text tools
- [ ] Markdown: edit → live preview updates (GFM table, code highlight)
- [ ] Markdown: export/download works
- [ ] Autosave: type text, reload page → content restored (localStorage `3new-studio:content:markdown`)
- [ ] YAML / JSON validation and preview; HTML sandboxed preview; password generation

## 5. Image tools (client-side only)
- [ ] Image resize: preset + manual size + aspect lock → download
- [ ] Format converter: PNG→JPG, PNG→WebP with quality → download
- [ ] DevTools Network: no image upload request to the server

## 6. Transcription & minutes
- [ ] Short audio (<10 min) upload → transcript returned
- [ ] **Audio >10 min** → progress shows `(1/N)…(N/N)`; every `/api/transcribe/` chunk (~19 MB) returns 200, no 413/504
- [ ] Browser recording → transcript returned
- [ ] Language selection (ja / en / fr) reflected in result
- [ ] Minutes generation (Haiku, then Sonnet) returns full 5-section output within timeout
- [ ] "Include English" option produces translation
- [ ] **Notion save** → page created in the configured database; returned URL opens

## 7. API protection (from a logged-out terminal)
- [ ] `curl -X POST -F audio=@sample.m4a https://<staging>/api/transcribe/` → 307 to login, **no OpenAI call** (check OpenAI usage/logs)
- [ ] Same for `/api/minutes/` and `/api/notion/`
- [ ] With header `x-middleware-subrequest: proxy:proxy:proxy:proxy:proxy` → still 307
- [ ] Upload >25 MB → 413 from Nginx

## 8. Browser network check (DevTools, full session: login → all tools → logout)
- [ ] Only expected origins: staging host, Supabase Auth (`*.supabase.co/auth/v1/*`), Google OAuth during Google login
- [ ] No `*.supabase.co/rest/v1`, `/storage/v1`, `/realtime/v1`, `/functions/v1` requests
- [ ] No requests to `*.vercel.app`, `vercel-insights`, or `studio.3new.eu` (production) from the staging page
- [ ] No mixed-content or CSP warnings in console

## 9. Logs (after the full checklist, and again after 24 h)
- [ ] `docker compose logs --since 24h studio` → no recurring errors / stack traces
- [ ] Nginx vhost error log → no recurring `upstream`, `413`, `504` entries beyond deliberate tests
- [ ] Docker log rotation active (`max-size 10m`, `max-file 5`)
