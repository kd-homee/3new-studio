'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ClaudeModel = 'haiku' | 'sonnet'

interface MinutesResult {
  japanese: string
  english: string | null
}

export function MinutesTool() {
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [model, setModel] = useState<ClaudeModel>('haiku')
  const [includeEnglish, setIncludeEnglish] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [result, setResult] = useState<MinutesResult | null>(null)
  const [notionUrl, setNotionUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    setResult(null)
    setNotionUrl(null)

    try {
      const res = await fetch('/api/minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, model, includeEnglish, title }),
      })
      if (!res.ok) throw new Error('生成に失敗しました')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('議事録の生成に失敗しました。もう一度お試しください。')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    const text = includeEnglish && result.english
      ? `${result.japanese}\n\n---\n\n${result.english}`
      : result.japanese
    navigator.clipboard.writeText(text)
  }

  const handleSaveToNotion = async () => {
    if (!result) return
    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: result.japanese, date }),
      })
      if (!res.ok) throw new Error('Notion保存に失敗しました')
      const data = await res.json()
      setNotionUrl(data.url)
    } catch {
      setError('Notionへの保存に失敗しました。もう一度お試しください。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: 'var(--bg-main)' }}>
      <div className="max-w-3xl w-full mx-auto p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
            📝 議事録生成
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            文字起こしテキストから議事録を自動生成します
          </p>
        </div>

        {/* Meta fields */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="会議タイトル（任意）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2.5 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Transcript input */}
        <textarea
          placeholder="文字起こしテキストをここに貼り付けてください"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={10}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none font-mono"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-content)', color: 'var(--text-primary)' }}
        />

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Model toggle */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium mr-1" style={{ color: 'var(--text-muted)' }}>モデル:</span>
            {(['haiku', 'sonnet'] as ClaudeModel[]).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  model === m
                    ? {
                        backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                        color: 'var(--text-primary)',
                        boxShadow: 'var(--shadow-accent)',
                      }
                    : { background: 'var(--bg-content)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                }
              >
                {m === 'haiku' ? '⚡ Haiku（高速）' : '✨ Sonnet（高精度）'}
              </button>
            ))}
          </div>

          {/* English toggle */}
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={includeEnglish}
              onChange={(e) => setIncludeEnglish(e.target.checked)}
              className="rounded"
            />
            🔄 英語も生成
          </label>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!transcript.trim() || isGenerating}
          className="w-full py-3 rounded-xl text-sm font-bold text-gray-900 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          {isGenerating ? '生成中...' : '✨ 議事録を生成'}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div
              className="rounded-xl p-6"
              style={{ background: 'var(--bg-content)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  📋 生成された議事録（日本語）
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    📋 コピー
                  </button>
                  <button
                    onClick={handleSaveToNotion}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-gray-50 transition-colors disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {isSaving ? '保存中...' : '📨 Notionに保存'}
                  </button>
                </div>
              </div>

              <article className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.japanese}</ReactMarkdown>
              </article>

              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium underline"
                  style={{ color: 'var(--accent)' }}
                >
                  ✅ Notionページを開く →
                </a>
              )}
            </div>

            {includeEnglish && result.english && (
              <div
                className="rounded-xl p-6"
                style={{ background: 'var(--bg-content)', border: '1px solid var(--border)' }}
              >
                <h2 className="text-sm font-black mb-4" style={{ color: 'var(--text-primary)' }}>
                  📋 English Version
                </h2>
                <article className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.english}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
