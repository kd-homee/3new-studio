// components/tools/ToolShell.tsx
'use client'
import { useEditorStore } from '@/store/editorStore'
import { Toolbar } from '@/components/layout/Toolbar'

interface ToolShellProps {
  onCopy: () => void
  onExport: () => void
  editorPane: React.ReactNode
  previewPane: React.ReactNode
}

export function ToolShell({
  editorPane,
  previewPane,
  onCopy,
  onExport,
}: ToolShellProps) {
  const mode = useEditorStore((s) => s.mode)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Toolbar onCopy={onCopy} onExport={onExport} />
      <div className="flex flex-1 overflow-hidden" style={{ background: 'var(--bg-main)' }}>
        {(mode === 'edit' || mode === 'split') && (
          <div
            className="flex-1 overflow-auto"
            style={{ background: 'var(--bg-editor)', borderRight: mode === 'split' ? '1px solid var(--border)' : 'none' }}
          >
            {editorPane}
          </div>
        )}
        {(mode === 'split' || mode === 'preview') && (
          <div
            className="flex-1 overflow-auto p-6"
            style={{ background: 'var(--bg-content)', boxShadow: mode === 'split' ? '-2px 0 8px rgba(0,0,0,0.03)' : 'none' }}
          >
            {previewPane}
          </div>
        )}
      </div>
    </div>
  )
}
