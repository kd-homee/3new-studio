export const DEFAULT_POST_LOGIN_PATH = '/tools/minutes'

const PLACEHOLDER_ORIGIN = 'http://same-origin.invalid'

// Backslash, C0 control characters (0x00-0x1F) and DEL (0x7F).
function hasUnsafeChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true
  }
  return false
}

// Returns a same-origin relative path (path + query + hash) or the fallback.
// Rejects absolute URLs, protocol-relative (//host), backslash tricks, control characters,
// and anything that would resolve to a different origin.
export function sanitizeNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_PATH
): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (hasUnsafeChars(value)) return fallback

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN)
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback
    const path = `${url.pathname}${url.search}${url.hash}`
    // Normalisation (e.g. "/.//host") must not yield a protocol-relative URL.
    return path.startsWith('/') && !path.startsWith('//') ? path : fallback
  } catch {
    return fallback
  }
}
