/**
 * @jest-environment node
 */
import { POST } from '@/app/api/notion/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@notionhq/client')

import { createClient } from '@/lib/supabase/server'
import { Client as NotionClient } from '@notionhq/client'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockNotionClient = NotionClient as jest.MockedClass<typeof NotionClient>
const ORIGINAL_ENV = process.env

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notion', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockUser(user: object | null) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

describe('POST /api/notion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test',
      ALLOWED_EMAILS: 'allowed@example.com',
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('未認証の場合は401を返す', async () => {
    mockUser(null)

    const res = await POST(makeRequest({ title: 'test', content: 'content', date: '2026-05-27' }))
    expect(res.status).toBe(401)
  })

  it('許可リスト外のユーザーは403でNotionに書き込まない', async () => {
    mockUser({ id: 'user-2', email: 'other@example.com' })

    const res = await POST(makeRequest({ title: 'test', content: 'content', date: '2026-05-27' }))
    expect(res.status).toBe(403)
    expect(MockNotionClient).not.toHaveBeenCalled()
  })

  it('Notionページを作成してURLを返す', async () => {
    mockUser({ id: 'user-1', email: 'allowed@example.com' })

    const mockPagesCreate = jest.fn().mockResolvedValue({
      url: 'https://notion.so/test-page-123',
    })
    MockNotionClient.prototype.pages = { create: mockPagesCreate } as any

    const res = await POST(
      makeRequest({ title: 'テスト会議', content: '## 1. 会議の目的\n定例', date: '2026-05-27' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockPagesCreate).toHaveBeenCalledTimes(1)
    expect(json.url).toBe('https://notion.so/test-page-123')
  })
})
