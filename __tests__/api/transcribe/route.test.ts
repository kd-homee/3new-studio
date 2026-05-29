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

import { POST } from '@/app/api/transcribe/route'

describe('POST /api/transcribe', () => {
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
})
