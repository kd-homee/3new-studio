// components/layout/Toolbar.tsx
'use client'
import { useEditorStore } from '@/store/editorStore'
import type { Mode } from '@/types'

interface ToolbarProps {
  onCopy: () => void
  onExport: () => void
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'edit', label: 'EDIT' },
  { id: 'split', label: 'SPLIT' },
  { id: 'preview', label: 'PREVIEW' },
]

export function Toolbar({ onCopy, onExport }: ToolbarProps) {
  const { mode, setMode, fileName, setFileName } = useEditorStore()

  return (
    <div
      className="flex items-center justify-between px-4 h-11 border-b flex-shrink-0"
      style={{ background: 'var(--bg-content)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Left: filename */}
      <div className="flex items-center gap-2">
        <input
          className="px-2 py-1 rounded-md text-sm font-medium outline-none focus:ring-2 w-36"
          style={{ background: '#f5f5f5', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          aria-label="File name"
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>.md</span>
      </div>

      {/* Right: actions + mode */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCopy}
          className="px-3 py-1 rounded-md text-xs font-semibold border transition-colors hover:bg-gray-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          COPY
        </button>
        <button
          onClick={onExport}
          className="px-3 py-1 rounded-md text-xs font-semibold border transition-colors hover:bg-gray-50"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          EXPORT
        </button>
        <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
        {MODES.map(({ id, label }) => {
          const isActive = mode === id
          return (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="px-3 py-1 rounded-md text-xs font-bold border-0 transition-all"
              style={
                isActive
                  ? {
                      backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-accent)',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }
              }
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
