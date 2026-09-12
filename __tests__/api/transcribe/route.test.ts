/**
 * @jest-environment node
 */
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({ text: 'こんにちは、テストです。' }),
      },
    },
  })),
}))
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { POST } from '@/app/api/transcribe/route'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const ORIGINAL_ENV = process.env

function mockUser(user: object | null) {
  mockCreateClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
}

function audioRequest() {
  const formData = new FormData()
  formData.append('audio', new Blob(['fake audio'], { type: 'audio/mp4' }), 'test.m4a')
  return new NextRequest('http://localhost/api/transcribe', { method: 'POST', body: formData })
}

function transcriptionCallCount(): number {
  type MockOpenAI = { audio: { transcriptions: { create: jest.Mock } } }
  const openai = jest.requireMock('openai').default as jest.Mock
  let calls = 0
  for (const result of openai.mock.results) {
    calls += (result.value as MockOpenAI).audio.transcriptions.create.mock.calls.length
  }
  return calls
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test',
      ALLOWED_EMAILS: 'allowed@example.com',
    }
    mockUser({ id: 'user-1', email: 'allowed@example.com' })
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it('音声ファイルを受け取りテキストを返す', async () => {
    const blob = new Blob(['fake audio'], { type: 'audio/mp4' })
    const formData = new FormData()
    formData.append('audio', blob, 'test.m4a')

    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.text).toBe('こんにちは、テストです。')
  })

  it('languageパラメータが渡される', async () => {
    const openai = require('openai').default
    const createMock = openai.mock.results[0].value.audio.transcriptions.create
    const blob = new Blob(['fake audio'], { type: 'audio/mp4' })
    const formData = new FormData()
    formData.append('audio', blob, 'test.m4a')
    formData.append('language', 'en')

    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    await POST(request)
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }))
  })

  it('audioフィールドがない場合は400を返す', async () => {
    const formData = new FormData()
    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('未認証の場合は401でOpenAIを呼ばない', async () => {
    mockUser(null)
    const before = transcriptionCallCount()

    const response = await POST(audioRequest())
    expect(response.status).toBe(401)
    expect(transcriptionCallCount()).toBe(before)
  })

  it('許可リスト外のユーザーは403でOpenAIを呼ばない', async () => {
    mockUser({ id: 'user-2', email: 'other@example.com' })
    const before = transcriptionCallCount()

    const response = await POST(audioRequest())
    expect(response.status).toBe(403)
    expect(transcriptionCallCount()).toBe(before)
  })

  it('ALLOWED_EMAILS未設定なら503でOpenAIを呼ばない（fail closed）', async () => {
    delete process.env.ALLOWED_EMAILS
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const before = transcriptionCallCount()

    const response = await POST(audioRequest())
    expect(response.status).toBe(503)
    expect(transcriptionCallCount()).toBe(before)
  })

  it('Supabase認証が利用できない場合は503', async () => {
    mockCreateClient.mockRejectedValue(new Error('supabase down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(audioRequest())
    expect(response.status).toBe(503)
  })
})
