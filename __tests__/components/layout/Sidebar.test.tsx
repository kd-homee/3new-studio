// __tests__/components/layout/Sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/layout/Sidebar'

jest.mock('next/navigation', () => ({
  usePathname: () => '/tools/markdown',
  useRouter: () => ({ push: jest.fn() }),
}))

test('renders 3NEW STUDIO brand', () => {
  render(<Sidebar />)
  expect(screen.getByText('3NEW STUDIO')).toBeInTheDocument()
})

test('renders テキストツール group', () => {
  render(<Sidebar />)
  expect(screen.getByText('テキストツール')).toBeInTheDocument()
})

test('renders 画像ツール group', () => {
  render(<Sidebar />)
  expect(screen.getByText('画像ツール')).toBeInTheDocument()
})

test('highlights active tool', () => {
  render(<Sidebar />)
  const markdownLink = screen.getByText('Markdown').closest('a')
  expect(markdownLink).toHaveClass('bg-gradient-to-r')
})
