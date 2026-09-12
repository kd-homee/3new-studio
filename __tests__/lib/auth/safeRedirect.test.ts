import { DEFAULT_POST_LOGIN_PATH, sanitizeNextPath } from '@/lib/auth/safeRedirect'

describe('sanitizeNextPath', () => {
  it.each([
    ['/tools/markdown/', '/tools/markdown/'],
    ['/tools/minutes', '/tools/minutes'],
    ['/tools/json/?tab=tree#node', '/tools/json/?tab=tree#node'],
    ['/', '/'],
    ['/tools/../tools/yaml/', '/tools/yaml/'],
  ])('同一オリジンの相対パス %s を許可する', (input, expected) => {
    expect(sanitizeNextPath(input)).toBe(expected)
  })

  it.each([
    [null],
    [undefined],
    [''],
    ['tools/markdown'],
    ['https://evil.example/'],
    ['http:evil.example'],
    ['javascript:alert(1)'],
    ['//evil.example'],
    ['///evil.example'],
    ['/\\evil.example'],
    ['\\\\evil.example'],
    ['@evil.example'],
    ['/.//evil.example'],
    ['/\tevil'],
    ['/tools\n/markdown'],
    ['/' + 'a'.repeat(2048)],
  ])('危険な値 %p はフォールバックする', (input) => {
    expect(sanitizeNextPath(input)).toBe(DEFAULT_POST_LOGIN_PATH)
  })

  it('フォールバック先を指定できる', () => {
    expect(sanitizeNextPath('//evil.example', '/')).toBe('/')
  })
})
