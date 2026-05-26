// components/tools/MonacoEditor.tsx
'use client'
import dynamic from 'next/dynamic'
import type { editor } from 'monaco-editor'

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

interface MonacoEditorProps {
  value: string
  language: string
  onChange: (value: string) => void
  className?: string
}

export function MonacoEditor({ value, language, onChange, className }: MonacoEditorProps) {
  const handleChange = (val: string | undefined) => {
    onChange(val ?? '')
  }

  const handleMount = (_editor: editor.IStandaloneCodeEditor) => {
    // editor instance available here if needed
  }

  return (
    <div className={className} style={{ height: '100%' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 1.8,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  )
}
