import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Mode, ToolId } from '@/types'
import { saveToStorage, loadFromStorage } from '@/lib/storage'

interface PersistedEditorState {
  activeTool: ToolId
  mode: Mode
  fileName: string
  contents: Partial<Record<ToolId, string>>
}

interface EditorState extends PersistedEditorState {
  setActiveTool: (tool: ToolId) => void
  setMode: (mode: Mode) => void
  setContent: (tool: ToolId, content: string) => void
  setFileName: (name: string) => void
}

const persisted = loadFromStorage<PersistedEditorState>('editor-state')

export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set) => ({
    activeTool: persisted?.activeTool ?? 'markdown',
    mode: persisted?.mode ?? 'split',
    fileName: persisted?.fileName ?? 'untitled',
    contents: persisted?.contents ?? {},
    setActiveTool: (tool) => set({ activeTool: tool }),
    setMode: (mode) => set({ mode }),
    setContent: (tool, content) =>
      set((s) => ({ contents: { ...s.contents, [tool]: content } })),
    setFileName: (fileName) => set({ fileName }),
  }))
)

let saveTimer: ReturnType<typeof setTimeout>
useEditorStore.subscribe((state) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveToStorage('editor-state', {
      activeTool: state.activeTool,
      mode: state.mode,
      fileName: state.fileName,
      contents: state.contents,
    } satisfies PersistedEditorState)
  }, 500)
})
