'use client'
import { useState } from 'react'
import { MonacoEditor } from './MonacoEditor'
import { ToolShell } from './ToolShell'
import { useAutosave } from '@/hooks/useAutosave'
import { downloadFile } from '@/lib/export'
import { useEditorStore } from '@/store/editorStore'
import { TOOLS } from '@/types'

const DEFAULT = TOOLS.find((t) => t.id === 'json')!.defaultContent

export function JsonTool() {
  const fileName = useEditorStore((s) => s.fileName)
  const { savedValue } = useAutosave('json', DEFAULT)
  const [content, setContent] = useState(savedValue || DEFAULT)
  const [minified, setMinified] = useState(false)

  const handleCopy = () => {
    try {
      const parsed = JSON.parse(content)
      navigator.clipboard.writeText(minified ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2))
    } catch { navigator.clipboard.writeText(content) }
  }

  return (
    <ToolShell
      onCopy={handleCopy}
      onExport={() => downloadFile(content, `${fileName}.json`, 'application/json')}
      editorPane={<MonacoEditor value={content} language="json" onChange={setContent} className="h-full" />}
      previewPane={
        <div>
          <div className="flex gap-2 mb-4">
            {(['pretty', 'minify'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setMinified(opt === 'minify')}
                className="px-3 py-1 rounded-md text-xs font-semibold border"
                style={
                  (opt === 'minify') === minified
                    ? { backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))', color: 'var(--text-primary)', border: 'none' }
                    : { border: '1px solid var(--border)', color: 'var(--text-secondary)', background: '#fff' }
                }
              >
                {opt === 'pretty' ? 'Pretty' : 'Minify'}
              </button>
            ))}
          </div>
          <JsonPreview content={content} minified={minified} />
        </div>
      }
    />
  )
}

export function JsonPreview({ content, minified = false }: { content: string; minified?: boolean }) {
  if (!content.trim()) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No content</p>
  try {
    const parsed = JSON.parse(content)
    if (minified) {
      return (
        <pre className="text-xs p-3 rounded-lg overflow-auto" style={{ background: '#1e1e1e', color: '#d4d4d4' }}>
          {JSON.stringify(parsed)}
        </pre>
      )
    }
    return (
      <div className="text-sm font-mono">
        <JsonNode value={parsed} depth={0} />
      </div>
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Parse error'
    return (
      <div className="rounded-lg p-3 text-sm" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}>
        <strong>Error:</strong> {msg}
      </div>
    )
  }
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  const [open, setOpen] = useState(true)
  if (value === null) return <span style={{ color: 'var(--text-muted)' }}>null</span>
  if (typeof value === 'boolean') return <span style={{ color: '#7c3aed' }}>{String(value)}</span>
  if (typeof value === 'number') return <span style={{ color: '#2563eb' }}>{value}</span>
  if (typeof value === 'string') return <span style={{ color: '#059669' }}>"{value}"</span>
  if (Array.isArray(value)) {
    return (
      <span>
        <button onClick={() => setOpen(!open)} className="text-xs mr-1 opacity-50">{open ? '▼' : '▶'}</button>
        <span style={{ color: 'var(--text-muted)' }}>[{value.length}]</span>
        {open && (
          <ul className="list-none pl-4 m-0 border-l" style={{ borderColor: 'var(--border)' }}>
            {value.map((item, i) => (
              <li key={i} className="py-0.5">
                <span className="text-xs mr-2" style={{ color: 'var(--text-muted)' }}>{i}:</span>
                <JsonNode value={item} depth={depth + 1} />
              </li>
            ))}
          </ul>
        )}
      </span>
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <span>
        <button onClick={() => setOpen(!open)} className="text-xs mr-1 opacity-50">{open ? '▼' : '▶'}</button>
        <span style={{ color: 'var(--text-muted)' }}>{'{'}…{'}'}</span>
        {open && (
          <div className="pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
            {entries.map(([k, v]) => (
              <div key={k} className="py-0.5">
                <span className="font-semibold" style={{ color: 'var(--accent-dark)' }}>"{k}"</span>
                <span className="mr-2" style={{ color: 'var(--accent-dark)' }}>:</span>
                <JsonNode value={v} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    )
  }
  return <span>{String(value)}</span>
}
