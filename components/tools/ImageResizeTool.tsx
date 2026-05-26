'use client'
import { useRef, useState } from 'react'

const PRESETS = [25, 50, 75, 100, 150, 200]

interface ImageInfo { src: string; width: number; height: number; name: string }

export function ImageResizeTool() {
  const [original, setOriginal] = useState<ImageInfo | null>(null)
  const [resized, setResized] = useState<string | null>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockAspect, setLockAspect] = useState(true)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const originalAspect = useRef(1)

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      originalAspect.current = img.width / img.height
      setOriginal({ src: url, width: img.width, height: img.height, name: file.name })
      setWidth(img.width)
      setHeight(img.height)
      setResized(null)
    }
    img.src = url
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleFile(file)
  }

  const applyResize = async (w: number, h: number) => {
    if (!original) return
    setProcessing(true)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.src = original.src
    await new Promise((r) => { img.onload = r })
    ctx.drawImage(img, 0, 0, w, h)
    setResized(canvas.toDataURL('image/png'))
    setProcessing(false)
  }

  const handlePreset = async (pct: number) => {
    if (!original) return
    const newW = Math.round(original.width * pct / 100)
    const newH = Math.round(original.height * pct / 100)
    setWidth(newW); setHeight(newH)
    await applyResize(newW, newH)
  }

  const handleWidthChange = (v: number) => {
    setWidth(v)
    if (lockAspect) setHeight(Math.round(v / originalAspect.current))
  }

  const handleHeightChange = (v: number) => {
    setHeight(v)
    if (lockAspect) setWidth(Math.round(v * originalAspect.current))
  }

  const handleDownload = () => {
    if (!resized || !original) return
    const a = document.createElement('a')
    a.href = resized
    a.download = `resized-${original.name}`
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 h-11 border-b flex-shrink-0"
        style={{ background: 'var(--bg-content)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>画像リサイズ</span>
      </div>
      <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--bg-main)' }}>
        {!original ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-lg mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer py-16 transition-colors hover:border-yellow-400"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-content)' }}
          >
            <span className="text-4xl mb-4">🖼️</span>
            <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>画像をドロップ or クリックして選択</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>PNG / JPG / WebP 対応</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Presets */}
            <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--bg-content)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>プリセット</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((pct) => (
                  <button key={pct} onClick={() => handlePreset(pct)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all hover:shadow-sm"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: '#fff' }}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Manual size */}
            <div className="rounded-xl p-4 shadow-sm" style={{ background: 'var(--bg-content)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>手動サイズ</p>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>幅</span>
                  <input type="number" value={width} onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded-md text-sm border outline-none"
                    style={{ borderColor: 'var(--border)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>px</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>高さ</span>
                  <input type="number" value={height} onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-24 px-2 py-1 rounded-md text-sm border outline-none"
                    style={{ borderColor: 'var(--border)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>px</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="accent-yellow-400 w-4 h-4" />
                  <span style={{ color: 'var(--text-secondary)' }}>アスペクト比を保持</span>
                </label>
                <button onClick={() => applyResize(width, height)}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', boxShadow: 'var(--shadow-accent)' }}>
                  適用
                </button>
              </div>
            </div>

            {/* Before / After */}
            <div className="grid grid-cols-2 gap-4">
              {[{ label: 'Before', src: original.src, w: original.width, h: original.height },
                { label: 'After', src: resized, w: width, h: height }].map(({ label, src, w, h }) => (
                <div key={label} className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-content)' }}>
                  <div className="px-4 py-2 flex justify-between text-xs font-bold uppercase tracking-widest border-b"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    <span>{label}</span><span>{w} × {h}px</span>
                  </div>
                  <div className="p-3 flex items-center justify-center" style={{ minHeight: 160, background: '#f9f9f9' }}>
                    {src ? <img src={src} alt={label} className="max-w-full max-h-48 object-contain rounded" /> : (
                      processing ? <span className="text-sm" style={{ color: 'var(--text-muted)' }}>処理中…</span>
                        : <span className="text-sm" style={{ color: 'var(--text-muted)' }}>まだリサイズしていません</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={handleDownload} disabled={!resized}
                className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', boxShadow: 'var(--shadow-accent)' }}>
                ダウンロード
              </button>
              <button onClick={() => { setOriginal(null); setResized(null) }}
                className="px-6 py-2.5 rounded-xl text-sm font-medium border"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: '#fff' }}>
                リセット
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
