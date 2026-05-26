'use client'
import { useEffect, useRef, useState } from 'react'
import { MonacoEditor } from './MonacoEditor'
import { ToolShell } from './ToolShell'
import { useAutosave } from '@/hooks/useAutosave'
import { downloadFile } from '@/lib/export'
import { useEditorStore } from '@/store/editorStore'
import { TOOLS } from '@/types'

const DEFAULT = TOOLS.find((t) => t.id === 'html')!.defaultContent

export function HtmlTool() {
  const fileName = useEditorStore((s) => s.fileName)
  const { savedValue } = useAutosave('html', DEFAULT)
  const [content, setContent] = useState(savedValue || DEFAULT)
  const [preview, setPreview] = useState(content)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setPreview(content), 500)
    return () => clearTimeout(debounceRef.current)
  }, [content])

  return (
    <ToolShell
      onCopy={() => navigator.clipboard.writeText(content)}
      onExport={() => downloadFile(content, `${fileName}.html`, 'text/html')}
      editorPane={<MonacoEditor value={content} language="html" onChange={setContent} className="h-full" />}
      previewPane={
        <iframe
          title="HTML Preview"
          sandbox="allow-scripts"
          srcDoc={preview}
          className="w-full h-full border-0 rounded-lg"
          style={{ minHeight: '400px' }}
        />
      }
    />
  )
}
