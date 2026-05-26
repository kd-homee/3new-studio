'use client'
import { useState } from 'react'
import yaml from 'js-yaml'
import { MonacoEditor } from './MonacoEditor'
import { ToolShell } from './ToolShell'
import { useAutosave } from '@/hooks/useAutosave'
import { downloadFile } from '@/lib/export'
import { useEditorStore } from '@/store/editorStore'
import { TOOLS } from '@/types'

const DEFAULT = TOOLS.find((t) => t.id === 'yaml')!.defaultContent

export function YamlTool() {
  const fileName = useEditorStore((s) => s.fileName)
  const { savedValue } = useAutosave('yaml', DEFAULT)
  const [content, setContent] = useState(savedValue || DEFAULT)

  return (
    <ToolShell
      onCopy={() => navigator.clipboard.writeText(content)}
      onExport={() => downloadFile(content, `${fileName}.yaml`, 'text/yaml')}
      editorPane={<MonacoEditor value={content} language="yaml" onChange={setContent} className="h-full" />}
      previewPane={<YamlPreview content={content} />}
    />
  )
}

export function YamlPreview({ content }: { content: string }) {
  if (!content.trim()) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No content</p>
  // Normalize literal \n sequences to actual newlines (handles JSX string attributes in tests)
  const normalized = content.replace(/\\n/g, '\n')
  try {
    const parsed = yaml.load(normalized)
    return (
      <div className="text-sm font-mono">
        <YamlNode value={parsed} depth={0} />
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

function YamlNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span style={{ color: 'var(--text-muted)' }}>null</span>
  if (typeof value === 'boolean') return <span style={{ color: '#7c3aed' }}>{String(value)}</span>
  if (typeof value === 'number') return <span style={{ color: '#2563eb' }}>{value}</span>
  if (typeof value === 'string') return <span style={{ color: '#059669' }}>"{value}"</span>
  if (Array.isArray(value)) {
    return (
      <ul className="list-none pl-4 m-0">
        {value.map((item, i) => (
          <li key={i} className="py-0.5">
            <span style={{ color: 'var(--text-muted)' }}>- </span>
            <YamlNode value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <div className={depth > 0 ? 'pl-3 border-l' : ''} style={{ borderColor: 'var(--border)' }}>
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="py-0.5">
            <span className="font-semibold" style={{ color: 'var(--accent-dark)' }}>{k}</span>
            <span className="mr-2" style={{ color: 'var(--accent-dark)' }}>:</span>
            <YamlNode value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  return <span>{String(value)}</span>
}
