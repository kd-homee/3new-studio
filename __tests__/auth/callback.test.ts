/**
 * @jest-environment node
 */
import { GET } from '@/app/auth/callback/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

function mockExchange(error: unknown) {
  mockCreateClient.mockResolvedValue({
    auth: { exchangeCodeForSession: async () => ({ error }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('GET /auth/callback', () => {
  beforeEach(() => jest.clearAllMocks())

  it('リバースプロキシ配下では転送ヘッダーの公開オリジンにリダイレクトする', async () => {
    mockExchange(null)
    const req = new NextRequest('http://0.0.0.0:3000/auth/callback/?code=abc&next=/tools/markdown/', {
      headers: { host: '127.0.0.1:3000', 'x-forwarded-host': 'studio.3new.eu', 'x-forwarded-proto': 'https' },
    })

    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://studio.3new.eu/tools/markdown/')
  })

  it('code交換に失敗した場合は公開オリジンのログインにリダイレクトする', async () => {
    mockExchange(new Error('invalid'))
    const req = new NextRequest('http://0.0.0.0:3000/auth/callback/?code=bad', {
      headers: { host: 'studio.3new.eu', 'x-forwarded-proto': 'https' },
    })

    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://studio.3new.eu/login?error=auth_failed')
  })

  it.each([
    ['//evil.example'],
    ['@evil.example'],
    ['https://evil.example/'],
    ['/\\evil.example'],
    ['/.//evil.example'],
  ])('危険なnext %p は同一オリジンの既定パスにリダイレクトする', async (next) => {
    mockExchange(null)
    const req = new NextRequest(
      `http://0.0.0.0:3000/auth/callback/?code=abc&next=${encodeURIComponent(next)}`,
      { headers: { host: 'studio.3new.eu', 'x-forwarded-proto': 'https' } }
    )

    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://studio.3new.eu/tools/minutes')
  })

  it('クエリ付きの安全なnextは保持する', async () => {
    mockExchange(null)
    const req = new NextRequest(
      `http://0.0.0.0:3000/auth/callback/?code=abc&next=${encodeURIComponent('/tools/json/?tab=tree')}`,
      { headers: { host: 'studio.3new.eu', 'x-forwarded-proto': 'https' } }
    )

    const res = await GET(req)
    expect(res.headers.get('location')).toBe('https://studio.3new.eu/tools/json/?tab=tree')
  })

  it('転送ヘッダーがない場合はHostヘッダーを使う（ローカル開発）', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback/', {
      headers: { host: 'localhost:3000' },
    })

    const res = await GET(req)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login?error=auth_failed')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})
