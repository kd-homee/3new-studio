import { render, screen } from '@testing-library/react'
import { JsonPreview } from '@/components/tools/JsonTool'

test('renders valid JSON as tree', () => {
  render(<JsonPreview content='{"name":"Alice","age":30}' />)
  expect(screen.getByText('"name"')).toBeInTheDocument()
  expect(screen.getByText('"Alice"')).toBeInTheDocument()
})

test('shows error for invalid JSON', () => {
  render(<JsonPreview content="{invalid}" />)
  expect(screen.getByText(/Error/)).toBeInTheDocument()
})

test('shows empty state', () => {
  render(<JsonPreview content="" />)
  expect(screen.getByText('No content')).toBeInTheDocument()
})
