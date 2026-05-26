'use client'
import { useRef, useState } from 'react'

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp'
const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPG' },
  { value: 'image/webp', label: 'WebP' },
]

export function FormatConverterTool() {
  const [original, setOriginal] = useState<{ src: string; name: string } | null>(null)
  const [converted, setConverted] = useState<string | null>(null)
  const [format, setFormat] = useState<OutputFormat>('image/png')
  const [quality, setQuality] = useState(90)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    setOriginal({ src: url, name: file.name })
    setConverted(null)
  }

  const handleConvert = async () => {
    if (!original) return
    setProcessing(true)
    const img = new Image()
    img.src = original.src
    await new Promise((r) => { img.onload = r })
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    const result = canvas.toDataURL(format, quality / 100)
    setConverted(result)
    setProcessing(false)
  }

  const handleDownload = () => {
    if (!converted || !original) return
    const ext = format.split('/')[1].replace('jpeg', 'jpg')
    const a = document.createElement('a')
    a.href = converted
    a.download = `${original.name.replace(/\.[^.]+$/, '')}.${ext}`
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 h-11 border-b flex-shrink-0"
        style={{ background: 'var(--bg-content)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>フォーマット変換</span>
      </div>
      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--bg-main)' }}>
        {!original ? (
          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-lg mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer py-16 transition-colors hover:border-yellow-400"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)' }}>
            <span className="text-4xl mb-4">🔄</span>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>画像をドロップ or クリックして選択</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>PNG / JPG / WebP / SVG 対応</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Format + Quality */}
            <div className="rounded-xl p-5 shadow-sm" style={{ background: 'var(--bg-content)' }}>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>出力フォーマット</p>
                <div className="flex gap-2">
                  {OUTPUT_FORMATS.map(({ value, label }) => (
                    <button key={value} onClick={() => setFormat(value)}
                      className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                      style={format === value
                        ? { backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', boxShadow: 'var(--shadow-accent)' }
                        : { border: '1px solid var(--border)', color: 'var(--text-secondary)', background: '#fff' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {format !== 'image/png' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>品質</p>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent-dark)' }}>{quality}</span>
                  </div>
                  <input type="range" min={1} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-yellow-400" />
                  <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>1</span><span>100</span>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'Original', src: original.src }, { label: 'Converted', src: converted }].map(
                ({ label, src }) => (
                  <div key={label} className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-content)' }}>
                    <div className="px-4 py-2 text-xs font-bold uppercase tracking-widest border-b"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{label}</div>
                    <div className="p-3 flex items-center justify-center" style={{ minHeight: 160, background: '#f9f9f9' }}>
                      {src ? <img src={src} alt={label} className="max-w-full max-h-48 object-contain rounded" /> : (
                        processing
                          ? <span className="text-sm" style={{ color: 'var(--text-muted)' }}>変換中…</span>
                          : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>変換後のプレビュー</span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleConvert} disabled={processing}
                className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', boxShadow: 'var(--shadow-accent)' }}>
                変換
              </button>
              <button onClick={handleDownload} disabled={!converted}
                className="px-6 py-2.5 rounded-xl text-sm font-bold border disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: '#fff' }}>
                ダウンロード
              </button>
              <button onClick={() => { setOriginal(null); setConverted(null) }}
                className="px-6 py-2.5 rounded-xl text-sm font-medium border"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: '#fff' }}>
                リセット
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
