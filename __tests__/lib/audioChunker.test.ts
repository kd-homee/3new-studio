function makeMockAudioBuffer(durationSeconds: number, sampleRate = 44100) {
  return {
    sampleRate,
    duration: durationSeconds,
    getChannelData: jest.fn().mockReturnValue(
      new Float32Array(Math.round(durationSeconds * sampleRate))
    ),
  }
}

const mockDecodeAudioData = jest.fn()

global.AudioContext = jest.fn().mockImplementation(() => ({
  decodeAudioData: mockDecodeAudioData,
})) as unknown as typeof AudioContext

import { splitAudioFile } from '@/lib/audioChunker'

describe('splitAudioFile', () => {
  beforeAll(() => {
    Object.defineProperty(File.prototype, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.resolve(new ArrayBuffer(100)),
    })
  })

  beforeEach(() => jest.clearAllMocks())

  it('5分の音声は1チャンクを返す', async () => {
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(5 * 60))
    const file = new File([new Uint8Array(100)], 'short.m4a', { type: 'audio/mp4' })
    const chunks = await splitAudioFile(file)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].name).toBe('chunk-0.wav')
    expect(chunks[0].type).toBe('audio/wav')
  })

  it('12分の音声は2チャンクに分割される', async () => {
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(12 * 60))
    const file = new File([new Uint8Array(100)], 'long.m4a', { type: 'audio/mp4' })
    const chunks = await splitAudioFile(file)
    expect(chunks).toHaveLength(2)
    expect(chunks[0].name).toBe('chunk-0.wav')
    expect(chunks[1].name).toBe('chunk-1.wav')
  })

  it('各チャンクはFileインスタンス', async () => {
    mockDecodeAudioData.mockResolvedValue(makeMockAudioBuffer(3 * 60))
    const file = new File([new Uint8Array(100)], 'test.m4a', { type: 'audio/mp4' })
    const chunks = await splitAudioFile(file)
    expect(chunks[0]).toBeInstanceOf(File)
  })
})
