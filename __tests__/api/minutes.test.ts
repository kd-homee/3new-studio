/**
 * @jest-environment node
 */
import { POST } from '@/app/api/minutes/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@anthropic-ai/sdk')

import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const MockAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/minutes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/minutes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('未認証の場合は401を返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as any)

    const res = await POST(makeRequest({ transcript: 'test', model: 'haiku', includeEnglish: false, title: '' }))
    expect(res.status).toBe(401)
  })

  it('Haiku モデルで議事録を生成して返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '## 1. 会議の目的\n定例ミーティング' }],
    })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    const res = await POST(
      makeRequest({ transcript: '今日の会議です', model: 'haiku', includeEnglish: false, title: 'テスト会議' })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-haiku-4-5' }))
    expect(json.japanese).toContain('会議の目的')
    expect(json.english).toBeNull()
  })

  it('Sonnet モデルを指定したときは sonnet-4-6 が使われる', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: '議事録' }],
    })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    await POST(makeRequest({ transcript: 'test', model: 'sonnet', includeEnglish: false, title: '' }))
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-4-6' }))
  })

  it('includeEnglish=true のとき英訳も返す', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)

    const mockCreate = jest.fn()
      .mockResolvedValueOnce({ content: [{ type: 'text', text: '日本語議事録' }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'English minutes' }] })
    MockAnthropic.prototype.messages = { create: mockCreate } as any

    const res = await POST(makeRequest({ transcript: 'test', model: 'haiku', includeEnglish: true, title: '' }))
    const json = await res.json()

    expect(json.japanese).toBe('日本語議事録')
    expect(json.english).toBe('English minutes')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})
