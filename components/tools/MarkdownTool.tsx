'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { MonacoEditor } from './MonacoEditor'
import { ToolShell } from './ToolShell'
import { useAutosave } from '@/hooks/useAutosave'
import { downloadFile } from '@/lib/export'
import { useEditorStore } from '@/store/editorStore'
import { loadFromStorage } from '@/lib/storage'
import { TOOLS } from '@/types'

const DEFAULT = TOOLS.find((t) => t.id === 'markdown')!.defaultContent

export function MarkdownTool() {
  const fileName = useEditorStore((s) => s.fileName)
  const [content, setContent] = useState(() => loadFromStorage<string>('content:markdown') ?? DEFAULT)
  useAutosave('markdown', content)

  const handleCopy = () => navigator.clipboard.writeText(content)
  const handleExport = () => downloadFile(content, `${fileName}.md`, 'text/markdown')

  return (
    <ToolShell
      onCopy={handleCopy}
      onExport={handleExport}
      editorPane={
        <MonacoEditor
          value={content}
          language="markdown"
          onChange={setContent}
          className="h-full"
        />
      }
      previewPane={
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {content}
          </ReactMarkdown>
        </article>
      }
    />
  )
}
