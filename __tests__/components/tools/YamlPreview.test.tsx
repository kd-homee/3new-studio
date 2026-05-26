import { render, screen } from '@testing-library/react'
import { YamlPreview } from '@/components/tools/YamlTool'

test('renders valid YAML as tree', () => {
  render(<YamlPreview content="name: Alice\nage: 30" />)
  expect(screen.getByText('name')).toBeInTheDocument()
  expect(screen.getByText('"Alice"')).toBeInTheDocument()
})

test('renders error for invalid YAML', () => {
  render(<YamlPreview content=": invalid: [yaml" />)
  expect(screen.getByText(/Error/)).toBeInTheDocument()
})

test('renders empty state for blank content', () => {
  render(<YamlPreview content="" />)
  expect(screen.getByText('No content')).toBeInTheDocument()
})
