/**
 * @jest-environment node
 */
import { isEmailAllowed, parseAllowedEmails, requireAllowedUser } from '@/lib/auth/guard'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const ORIGINAL_ENV = process.env

function mockGetUser(result: { data: { user: unknown }; error: unknown }) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: async () => result },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('parseAllowedEmails / isEmailAllowed', () => {
  it('カンマ区切りを小文字・trimして解析する', () => {
    expect(parseAllowedEmails(' A@Example.com, b@example.com ,,')).toEqual(['a@example.com', 'b@example.com'])
    expect(parseAllowedEmails(undefined)).toEqual([])
  })

  it('空の許可リストは拒否する（fail closed）', () => {
    expect(isEmailAllowed('a@example.com', [])).toBe(false)
    expect(isEmailAllowed(null, ['a@example.com'])).toBe(false)
    expect(isEmailAllowed('A@EXAMPLE.COM', ['a@example.com'])).toBe(true)
  })
})

describe('requireAllowedUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test',
      ALLOWED_EMAILS: 'allowed@example.com',
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it('許可リストのユーザーを通す（大文字小文字を区別しない）', async () => {
    mockGetUser({ data: { user: { id: 'u1', email: 'Allowed@Example.com' } }, error: null })
    const result = await requireAllowedUser()
    expect(result.response).toBeUndefined()
    expect(result.user?.id).toBe('u1')
  })

  it('セッションがない場合は401', async () => {
    mockGetUser({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400 } })
    expect((await requireAllowedUser()).response?.status).toBe(401)
  })

  it('無効なトークンは401', async () => {
    mockGetUser({ data: { user: null }, error: { name: 'AuthApiError', status: 403 } })
    expect((await requireAllowedUser()).response?.status).toBe(401)
  })

  it('許可リスト外のユーザーは403', async () => {
    mockGetUser({ data: { user: { id: 'u2', email: 'other@example.com' } }, error: null })
    expect((await requireAllowedUser()).response?.status).toBe(403)
  })

  it('メールアドレスのないユーザーは403', async () => {
    mockGetUser({ data: { user: { id: 'u3' } }, error: null })
    expect((await requireAllowedUser()).response?.status).toBe(403)
  })

  it('ALLOWED_EMAILSが空なら503（ユーザー確認前に拒否）', async () => {
    process.env.ALLOWED_EMAILS = ' , '
    expect((await requireAllowedUser()).response?.status).toBe(503)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('Supabase環境変数がない場合は503', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect((await requireAllowedUser()).response?.status).toBe(503)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('Supabaseへのネットワーク障害は503', async () => {
    mockGetUser({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0 } })
    expect((await requireAllowedUser()).response?.status).toBe(503)
  })

  it('Supabaseサーバーエラーは503', async () => {
    mockGetUser({ data: { user: null }, error: { name: 'AuthApiError', status: 500 } })
    expect((await requireAllowedUser()).response?.status).toBe(503)
  })

  it('クライアント生成やgetUserが例外を投げたら503', async () => {
    mockCreateClient.mockRejectedValue(new Error('boom'))
    expect((await requireAllowedUser()).response?.status).toBe(503)

    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => { throw new TypeError('fetch failed') } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    expect((await requireAllowedUser()).response?.status).toBe(503)
  })
})
