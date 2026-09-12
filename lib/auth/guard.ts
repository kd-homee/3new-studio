import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Application-level guard for API routes (defense in depth behind proxy.ts).
// Same Supabase Auth session; additionally enforces ALLOWED_EMAILS and fails closed
// when auth configuration or Supabase itself is unavailable.

export type AuthGuardResult =
  | { user: User; response?: undefined }
  | { user?: undefined; response: NextResponse }

export function parseAllowedEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// Empty allowlist denies (unlike proxy.ts, which treats it as "allow all signed-in users").
export function isEmailAllowed(email: string | null | undefined, allowed: string[]): boolean {
  if (!email || allowed.length === 0) return false
  return allowed.includes(email.trim().toLowerCase())
}

function deny(status: 401 | 403 | 503, error: string): AuthGuardResult {
  return { response: NextResponse.json({ error }, { status }) }
}

export async function requireAllowedUser(): Promise<AuthGuardResult> {
  const allowed = parseAllowedEmails(process.env.ALLOWED_EMAILS)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    allowed.length === 0
  ) {
    console.error('[auth-guard] auth configuration unavailable (Supabase env or ALLOWED_EMAILS missing)')
    return deny(503, 'Service unavailable')
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    const user = data?.user ?? null

    if (!user) {
      // No session / invalid token → 401. Network or Supabase server errors → 503.
      const upstreamFailure =
        !!error && error.name !== 'AuthSessionMissingError' && (!error.status || error.status >= 500)
      if (upstreamFailure) {
        console.error('[auth-guard] Supabase auth unavailable:', error.name)
        return deny(503, 'Service unavailable')
      }
      return deny(401, 'Unauthorized')
    }

    if (!isEmailAllowed(user.email, allowed)) {
      return deny(403, 'Forbidden')
    }

    return { user }
  } catch (err) {
    console.error('[auth-guard] auth check failed:', err instanceof Error ? err.name : 'unknown error')
    return deny(503, 'Service unavailable')
  }
}
