# 3NEW Studio — Phase 1 Security Review (VPS hosting)

Scope: auth/API exposure when moving from Vercel to an XServer VPS container, **without changing the
Supabase Auth architecture**. Findings verified against a local build of `feat/xserver-vps-migration`
(standalone container + the Nginx template).

## F1. `/api/transcribe` relies on `proxy.ts` alone — medium

**Current state.** `/api/minutes` and `/api/notion` call `supabase.auth.getUser()` and return 401 if there
is no user. `/api/transcribe` has **no in-route check**; it is protected only by `proxy.ts`.

**Is the proxy fail-closed today?** Verified locally (container, and container behind Nginx):

| Scenario | Result |
|---|---|
| Unauthenticated GET/POST `/api/transcribe/` | 307 → `/login` (no OpenAI call) |
| `x-middleware-subrequest` bypass header (CVE-2025-29927 style) | 307 (Next 16.2.6 not affected; Nginx template also strips the header) |
| Supabase unreachable / env missing | `getUser()` throws or returns no user → 500 / redirect (closed) |
| Container port | bound to `127.0.0.1` only; the proxy runs in-process, so even direct access is gated |

**Where it is *not* fail-closed:**

1. **Empty `ALLOWED_EMAILS` → fail-open.** `proxy.ts` only enforces the allowlist when it is non-empty
   (`allowed.length > 0 && ...`). A VPS `.env` missing this variable would admit **any** account that can sign in
   to the Supabase project (e.g. any Google account, if sign-ups are enabled), giving them the paid Anthropic
   and OpenAI endpoints.
   *Mitigated in this branch without code change:* `docker-compose.yml` refuses to start unless
   `ALLOWED_EMAILS` is set (`${ALLOWED_EMAILS:?}`).
2. **Allowlist is proxy-only for all three APIs.** `/api/minutes` and `/api/notion` check "is logged in", not
   "is allowed"; `/api/transcribe` checks nothing. Any future matcher change, route rename, or proxy refactor
   silently removes protection (Next.js docs explicitly recommend verifying auth inside handlers).
3. Repo is **public**, so route names and the proxy logic are known to anyone.

**Verdict.** Adequate for Phase 1 staging *with* the compose guard, but not defense-in-depth.

### Proposed (NOT implemented — separate approval requested)

Small shared helper, same Supabase Auth, no architecture change:

```ts
// lib/auth/requireAllowedUser.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireAllowedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  // Fail closed in route handlers: empty allowlist denies.
  if (!allowed.includes(user.email.toLowerCase()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}
```

Call it first in `/api/transcribe`, `/api/minutes`, `/api/notion` (`const denied = await requireAllowedUser(); if (denied) return denied`),
add a 401 test for `/api/transcribe` mirroring `__tests__/api/minutes.test.ts`, and optionally cap upload
size / validate `language` in `/api/transcribe`. Estimated: ~40 lines + tests, one PR.

## F2. `/auth/callback` redirected to the container bind address — high (fixed in this branch)

`new URL(request.url).origin` resolves to `https://0.0.0.0:3000` in the standalone server behind a reverse
proxy (so does `request.nextUrl.origin` in route handlers), so Google OAuth would have completed the code
exchange and then redirected the browser to an invalid host. Fixed by deriving the public origin from
`X-Forwarded-Host`/`Host` and `X-Forwarded-Proto` (set by the Nginx template and by Vercel), falling back to
`nextUrl` for local dev. Same Supabase flow and redirect semantics. Verified through the Nginx template
(`/auth/callback/` → `https://studio.3new.eu/login?error=auth_failed`) and by `__tests__/auth/callback.test.ts`.
Host-header spoofing only affects the spoofing client's own redirect; Nginx overwrites both headers.

## F3. `next` parameter in `/auth/callback` — low (pre-existing, not changed)

The redirect target is `${origin}${next}` with `next` taken from the query string unvalidated. Values such as
`@evil.example` produce `https://studio.3new.eu@evil.example`, i.e. an open redirect after a successful login.
Proposed together with F1: accept `next` only if it starts with `/` and not `//`.

## F4. Build-time secrets

- Server secrets (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `NOTION_*`) are runtime-only (`env_file`); `.env*` is
  excluded from the Docker build context; verified no `.env*` file exists in the image.
- `/api/transcribe` previously constructed the OpenAI client at import time, which made `next build` fail
  without `OPENAI_API_KEY` (likely cause of the failing CI runs). Now created lazily on first request.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are build args because Next.js inlines them into
  the browser bundle; they are public by design but still not committed.

## F5. Other hardening already in this branch

Non-root `node` user, read-only root filesystem, `cap_drop: ALL`, `no-new-privileges`, localhost-only port,
Docker log rotation, Nginx `client_max_body_size 25m`, HSTS matching current Vercel policy.
