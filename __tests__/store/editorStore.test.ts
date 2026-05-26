import { act } from '@testing-library/react'
import { useEditorStore } from '@/store/editorStore'

beforeEach(() => {
  useEditorStore.setState({
    activeTool: 'markdown',
    mode: 'split',
    fileName: 'untitled',
    contents: {},
  })
})

test('setActiveTool changes active tool', () => {
  act(() => useEditorStore.getState().setActiveTool('yaml'))
  expect(useEditorStore.getState().activeTool).toBe('yaml')
})

test('setMode changes editor mode', () => {
  act(() => useEditorStore.getState().setMode('preview'))
  expect(useEditorStore.getState().mode).toBe('preview')
})

test('setContent stores content per tool', () => {
  act(() => useEditorStore.getState().setContent('markdown', '# Test'))
  expect(useEditorStore.getState().contents['markdown']).toBe('# Test')
})

test('setFileName updates file name', () => {
  act(() => useEditorStore.getState().setFileName('my-doc'))
  expect(useEditorStore.getState().fileName).toBe('my-doc')
})
