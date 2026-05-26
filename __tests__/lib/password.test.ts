import { generatePassword, getStrength } from '@/lib/password'

test('generates password of specified length', () => {
  const pwd = generatePassword(16, { upper: true, lower: true, numbers: true, symbols: false })
  expect(pwd).toHaveLength(16)
})

test('generated password only contains allowed chars (no symbols)', () => {
  const pwd = generatePassword(20, { upper: true, lower: true, numbers: true, symbols: false })
  expect(pwd).toMatch(/^[A-Za-z0-9]+$/)
})

test('generated password contains symbols when enabled', () => {
  let hasSym = false
  for (let i = 0; i < 20; i++) {
    const pwd = generatePassword(32, { upper: false, lower: false, numbers: false, symbols: true })
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) { hasSym = true; break }
  }
  expect(hasSym).toBe(true)
})

test('getStrength returns Weak for short password', () => {
  expect(getStrength('abc')).toBe('Weak')
})

test('getStrength returns Very Strong for long mixed password', () => {
  expect(getStrength('aB3$aB3$aB3$aB3$')).toBe('Very Strong')
})
