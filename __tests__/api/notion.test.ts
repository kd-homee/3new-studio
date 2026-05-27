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

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/notion', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/notion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as any)

    const res = await POST(makeRequest({ title: 'test', content: 'content', date: '2026-05-27' }))
    expect(res.status).toBe(401)
  })

  it('Notionページを作成してURLを返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

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
