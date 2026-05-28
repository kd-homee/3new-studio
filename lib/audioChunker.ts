const CHUNK_SECONDS = 10 * 60
const TARGET_SAMPLE_RATE = 16000

export async function splitAudioFile(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const chunkCount = Math.ceil(audioBuffer.duration / CHUNK_SECONDS)
  const chunks: File[] = []

  for (let i = 0; i < chunkCount; i++) {
    const startSec = i * CHUNK_SECONDS
    const endSec = Math.min(startSec + CHUNK_SECONDS, audioBuffer.duration)
    const wavBuffer = extractChunkAsWav(audioBuffer, startSec, endSec)
    const blob = new Blob([wavBuffer], { type: 'audio/wav' })
    chunks.push(new File([blob], `chunk-${i}.wav`, { type: 'audio/wav' }))
  }

  return chunks
}

function extractChunkAsWav(buf: AudioBuffer, startSec: number, endSec: number): ArrayBuffer {
  const srcRate = buf.sampleRate
  const startSample = Math.round(startSec * srcRate)
  const endSample = Math.round(endSec * srcRate)
  const mono = buf.getChannelData(0).slice(startSample, endSample)
  const downsampled = downsample(mono, srcRate, TARGET_SAMPLE_RATE)
  return encodeWav(downsampled, TARGET_SAMPLE_RATE)
}

function downsample(samples: Float32Array, srcRate: number, dstRate: number): Float32Array {
  const ratio = srcRate / dstRate
  const result = new Float32Array(Math.round(samples.length / ratio))
  for (let i = 0; i < result.length; i++) {
    result[i] = samples[Math.round(i * ratio)]
  }
  return result
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const byteCount = samples.length * 2
  const buf = new ArrayBuffer(44 + byteCount)
  const view = new DataView(buf)

  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + byteCount, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(view, 36, 'data')
  view.setUint32(40, byteCount, true)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return buf
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
