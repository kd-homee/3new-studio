const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

export interface PasswordOptions {
  upper: boolean
  lower: boolean
  numbers: boolean
  symbols: boolean
}

export function generatePassword(length: number, opts: PasswordOptions): string {
  let charset = ''
  if (opts.upper) charset += UPPER
  if (opts.lower) charset += LOWER
  if (opts.numbers) charset += NUMBERS
  if (opts.symbols) charset += SYMBOLS
  if (!charset) charset = LOWER

  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => charset[n % charset.length]).join('')
}

export type StrengthLabel = 'Weak' | 'Medium' | 'Strong' | 'Very Strong'

export function getStrength(password: string): StrengthLabel {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 16) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return 'Weak'
  if (score === 2) return 'Medium'
  if (score === 3) return 'Strong'
  return 'Very Strong'
}
