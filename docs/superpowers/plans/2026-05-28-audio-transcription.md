# Audio Transcription (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** iPhoneのボイスメモ等の音声ファイル（またはブラウザ内録音）をOpenAI Whisper APIで文字起こしし、議事録生成ツールのテキストエリアに自動入力する。

**Architecture:** 3つの独立したユニットを追加する。①`POST /api/transcribe` — 音声ファイルをWhisper APIに転送してテキストを返すAPIルート。②`lib/audioChunker.ts` — 25MB超のファイルをブラウザ内で10分チャンクに分割するクライアント専用ユーティリティ。③`MinutesTool.tsx` の更新 — ファイルアップロードUI・ブラウザ録音・文字起こし呼び出し・テキストエリア自動入力を追加。

**Tech Stack:** `openai` npm package (Whisper API), Web Audio API, MediaRecorder API, Jest + React Testing Library (既存テスト環境)

---

## ファイル構成

| 操作 | ファイル |
|---|---|
| 新規作成 | `app/api/transcribe/route.ts` |
| 新規作成 | `lib/audioChunker.ts` |
| 新規作成 | `__tests__/api/transcribe/route.test.ts` |
| 新規作成 | `__tests__/lib/audioChunker.test.ts` |
| 変更 | `components/tools/MinutesTool.tsx` |
| 変更 | `__tests__/components/tools/MinutesTool.test.tsx` |

---

### Task 1: openai パッケージのインストールと環境変数の設定

**Files:**
- Modify: `package.json` (npm install 経由)
- Modify: `.env.local`

- [ ] **Step 1: openai パッケージをインストール**

```bash
cd 3new-studio
npm install openai
```

Expected: `package.json` の `dependencies` に `"openai": "^..."` が追加される。

- [ ] **Step 2: .env.local に OPENAI_API_KEY を追加**

`.env.local` に以下を追記（既存の他のキーはそのまま）:

```
OPENAI_API_KEY=sk-...
```

Notionのapi key管理台帳にも記録すること。

- [ ] **Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "feat: install openai package for Whisper API"
```

---

### Task 2: POST /api/transcribe エンドポイントの作成

**Files:**
- Create: `app/api/transcribe/route.ts`
- Create: `__tests__/api/transcribe/route.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/api/transcribe/route.test.ts` を新規作成:

```typescript
jest.mock('openai', () => ({
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPattern="api/transcribe"
```

Expected: FAIL — `Cannot find module '@/app/api/transcribe/route'`

- [ ] **Step 3: APIルートを実装**

`app/api/transcribe/route.ts` を新規作成:

```typescript
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() })

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const audio = formData.get('audio')

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  const filename = audio instanceof File ? audio.name : 'audio.m4a'
  const file = new File([audio], filename, { type: audio.type })

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ja',
  })

  return NextResponse.json({ text: result.text })
}
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx jest --testPathPattern="api/transcribe"
```

Expected: PASS (2 tests)

- [ ] **Step 5: コミット**

```bash
git add app/api/transcribe/route.ts __tests__/api/transcribe/route.test.ts
git commit -m "feat: add POST /api/transcribe endpoint using OpenAI Whisper"
```

---

### Task 3: 音声チャンク分割ユーティリティの作成

**Files:**
- Create: `lib/audioChunker.ts`
- Create: `__tests__/lib/audioChunker.test.ts`

注意: このモジュールはブラウザ専用（AudioContext使用）。テストでは `AudioContext` をグローバルモックで代替する。

- [ ] **Step 1: 失敗するテストを書く**

`__tests__/lib/audioChunker.test.ts` を新規作成:

```typescript
// AudioContext はブラウザAPIのためモック
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
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPattern="lib/audioChunker"
```

Expected: FAIL — `Cannot find module '@/lib/audioChunker'`

- [ ] **Step 3: audioChunker.ts を実装**

`lib/audioChunker.ts` を新規作成:

```typescript
const CHUNK_SECONDS = 10 * 60  // 10分チャンク
const TARGET_SAMPLE_RATE = 16000  // 16kHz モノラル (10分 ≈ 19MB WAV)

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
  view.setUint16(20, 1, true)             // PCM
  view.setUint16(22, 1, true)             // mono
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
```

- [ ] **Step 4: テストがパスすることを確認**

```bash
npx jest --testPathPattern="lib/audioChunker"
```

Expected: PASS (3 tests)

- [ ] **Step 5: コミット**

```bash
git add lib/audioChunker.ts __tests__/lib/audioChunker.test.ts
git commit -m "feat: add audio chunker for splitting large files into 10-min WAV chunks"
```

---

### Task 4: MinutesTool の音声入力UI・ロジックの追加

**Files:**
- Modify: `components/tools/MinutesTool.tsx`
- Modify: `__tests__/components/tools/MinutesTool.test.tsx`

- [ ] **Step 1: 既存テストファイルに audioChunker のモックと新テストを追加**

`__tests__/components/tools/MinutesTool.test.tsx` の先頭（既存の `jest.mock('react-markdown', ...)` の直前）に追加:

```typescript
jest.mock('@/lib/audioChunker', () => ({
  splitAudioFile: jest.fn().mockResolvedValue([
    new File(['wav data'], 'chunk-0.wav', { type: 'audio/wav' }),
  ]),
}))
```

ファイル末尾（既存の `describe('MinutesTool', ...)` の閉じ括弧の後）に追記:

```typescript
describe('MinutesTool - 音声入力UI', () => {
  beforeEach(() => jest.clearAllMocks())

  it('音声アップロードゾーンが表示される', () => {
    render(<MinutesTool />)
    expect(screen.getByText(/音声ファイルをここにドロップ/)).toBeInTheDocument()
  })

  it('ファイル選択後にファイル名と文字起こし開始ボタンが表示される', async () => {
    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    const file = new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByText('meeting.m4a')).toBeInTheDocument()
    expect(screen.getByText('🔤 文字起こし開始')).toBeInTheDocument()
  })

  it('✕ ボタンでファイルがクリアされる', async () => {
    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    const file = new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(await screen.findByText('✕'))
    expect(screen.queryByText('meeting.m4a')).not.toBeInTheDocument()
  })

  it('文字起こし開始を押すとテキストエリアに結果が入る', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ text: '文字起こし結果のテキストです。' }),
    } as Response)

    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    fireEvent.change(input, { target: { files: [new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })] } })
    fireEvent.click(await screen.findByText('🔤 文字起こし開始'))

    const textarea = screen.getByPlaceholderText(/文字起こし/)
    expect(await screen.findByDisplayValue('文字起こし結果のテキストです。')).toBe(textarea)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPattern="MinutesTool"
```

Expected: 新しい4テストがすべて FAIL（`音声ファイルをここにドロップ` が見つからない等）

- [ ] **Step 3: MinutesTool.tsx の import と state を更新**

`components/tools/MinutesTool.tsx` の1行目を以下に置き換え:

```typescript
'use client'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

既存の `const [error, setError] = useState<string | null>(null)` の後（22行目付近）に追加:

```typescript
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeProgress, setTranscribeProgress] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
```

- [ ] **Step 4: ハンドラー関数を追加**

`handleSaveToNotion` 関数の閉じ括弧の直後（74行目付近）に追加:

```typescript
  const handleTranscribe = async () => {
    if (!audioFile) return
    setIsTranscribing(true)
    setTranscribeProgress(null)
    setError(null)
    try {
      const { splitAudioFile } = await import('@/lib/audioChunker')
      const chunks = await splitAudioFile(audioFile)
      const texts: string[] = []
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) setTranscribeProgress(`処理中... (${i + 1}/${chunks.length})`)
        const formData = new FormData()
        formData.append('audio', chunks[i], chunks[i].name)
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        texts.push(data.text)
      }
      setTranscript(texts.join(' '))
      setAudioFile(null)
    } catch {
      setError('文字起こしに失敗しました。もう一度お試しください。')
    } finally {
      setIsTranscribing(false)
      setTranscribeProgress(null)
    }
  }

  const handleRecordingToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioFile(new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' }))
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setError('マイクへのアクセスを許可してください。')
    }
  }
```

- [ ] **Step 5: 音声入力UIをJSXに追加**

`MinutesTool.tsx` のJSX内、`{/* Meta fields */}` ブロックの後、`{/* Transcript input */}` の `<textarea ...>` の直前に追加:

```tsx
        {/* Audio Input Section */}
        <div className="space-y-2">
          <label
            className="flex flex-col items-center justify-center w-full min-h-28 rounded-xl border-2 border-dashed cursor-pointer"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) setAudioFile(file)
            }}
          >
            <input
              data-testid="audio-file-input"
              type="file"
              accept=".m4a,.mp3,.mp4,.wav,.webm,audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setAudioFile(file)
              }}
            />
            <span className="text-2xl mb-1">🎵</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              音声ファイルをここにドロップ
            </span>
            <span className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              または タップして選択 — m4a / mp3 / wav / webm（25MB超は自動分割）
            </span>
          </label>

          <button
            type="button"
            onClick={handleRecordingToggle}
            className="text-xs underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {isRecording ? '⏹ 録音を停止する' : 'その場で録音する 🎤'}
          </button>
          {isRecording && (
            <p className="text-xs" style={{ color: 'var(--accent)' }}>
              録音中... ※ 画面を切り替えると録音が止まります
            </p>
          )}

          {audioFile && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-content)', border: '1px solid var(--border)' }}
            >
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                {audioFile.name}
              </span>
              <button
                type="button"
                onClick={() => setAudioFile(null)}
                className="text-xs px-1 rounded"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
              <button
                type="button"
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{
                  backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                  color: 'var(--text-primary)',
                }}
              >
                {isTranscribing
                  ? (transcribeProgress ?? '文字起こし中...')
                  : '🔤 文字起こし開始'}
              </button>
            </div>
          )}
        </div>
```

- [ ] **Step 6: 全テストを実行**

```bash
npm test
```

Expected: 全テスト PASS（既存テスト含む）

- [ ] **Step 7: コミット**

```bash
git add components/tools/MinutesTool.tsx __tests__/components/tools/MinutesTool.test.tsx
git commit -m "feat: add audio upload and recording UI to MinutesTool with Whisper transcription"
```

---

## 完了後の手動確認チェックリスト

- [ ] `npm run dev` でローカル起動し、`/tools/minutes` を開く
- [ ] PCブラウザでm4a/mp3ファイルをアップロード → 「文字起こし開始」→ テキストエリアに入力されること
- [ ] iPhoneのSafariで同ページを開き、ボイスメモのファイルをアップロードできること
- [ ] ブラウザ録音ボタンを押してマイク許可 → 録音停止 → ファイルが設定されること
- [ ] 25MB超ファイルでブラウザのネットワークタブに複数POSTが出ること（開発者ツール）
- [ ] エラー時（APIキー未設定など）にエラーメッセージが表示されること
