// __tests__/components/layout/Toolbar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from '@/components/layout/Toolbar'
import { useEditorStore } from '@/store/editorStore'

beforeEach(() => {
  useEditorStore.setState({ mode: 'split', fileName: 'untitled', activeTool: 'markdown', contents: {} })
})

test('renders mode buttons', () => {
  render(<Toolbar onCopy={jest.fn()} onExport={jest.fn()} />)
  expect(screen.getByText('EDIT')).toBeInTheDocument()
  expect(screen.getByText('SPLIT')).toBeInTheDocument()
  expect(screen.getByText('PREVIEW')).toBeInTheDocument()
})

test('SPLIT button is highlighted by default', () => {
  render(<Toolbar onCopy={jest.fn()} onExport={jest.fn()} />)
  const splitBtn = screen.getByText('SPLIT')
  expect(splitBtn).toHaveStyle({ backgroundImage: expect.stringContaining('gradient') })
})

test('clicking EDIT changes mode to edit', async () => {
  render(<Toolbar onCopy={jest.fn()} onExport={jest.fn()} />)
  await userEvent.click(screen.getByText('EDIT'))
  expect(useEditorStore.getState().mode).toBe('edit')
})

test('clicking COPY calls onCopy', async () => {
  const onCopy = jest.fn()
  render(<Toolbar onCopy={onCopy} onExport={jest.fn()} />)
  await userEvent.click(screen.getByText('COPY'))
  expect(onCopy).toHaveBeenCalledTimes(1)
})
