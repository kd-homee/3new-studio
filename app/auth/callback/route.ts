import { sanitizeNextPath } from '@/lib/auth/safeRedirect'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// Public origin as seen by the browser. Behind a reverse proxy the standalone server resolves
// request.url / nextUrl to its bind address (e.g. https://0.0.0.0:3000), so prefer the
// forwarded headers set by Nginx (and Vercel), falling back to nextUrl for local dev.
function publicOrigin(request: NextRequest): string {
  const first = (value: string | null) => value?.split(',')[0]?.trim() || null
  const host = first(request.headers.get('x-forwarded-host')) ?? first(request.headers.get('host'))
  const proto = first(request.headers.get('x-forwarded-proto')) ?? request.nextUrl.protocol.replace(':', '')
  return host ? `${proto}://${host}` : request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = publicOrigin(request)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
