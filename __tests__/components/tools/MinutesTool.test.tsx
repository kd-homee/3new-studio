import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => {} }))

import { MinutesTool } from '@/components/tools/MinutesTool'

global.fetch = jest.fn()
Object.assign(navigator, { clipboard: { writeText: jest.fn() } })

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('MinutesTool', () => {
  beforeEach(() => jest.clearAllMocks())

  it('テキストエリア・タイトル・日付フィールドが表示される', () => {
    render(<MinutesTool />)
    expect(screen.getByPlaceholderText(/文字起こし/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/会議タイトル/)).toBeInTheDocument()
  })

  it('テキストが空のとき生成ボタンは無効', () => {
    render(<MinutesTool />)
    const btn = screen.getByRole('button', { name: /議事録を生成/ })
    expect(btn).toBeDisabled()
  })

  it('テキスト入力後に生成ボタンが有効になる', () => {
    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    const btn = screen.getByRole('button', { name: /議事録を生成/ })
    expect(btn).not.toBeDisabled()
  })

  it('生成ボタンを押すと /api/minutes に POST する', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ japanese: '## 1. 会議の目的\nテスト', english: null }),
    } as Response)

    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    fireEvent.click(screen.getByRole('button', { name: /議事録を生成/ }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/minutes', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('生成結果が表示される', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ japanese: '## 1. 会議の目的\n定例ミーティング', english: null }),
    } as Response)

    render(<MinutesTool />)
    fireEvent.change(screen.getByPlaceholderText(/文字起こし/), {
      target: { value: '会議の内容' },
    })
    fireEvent.click(screen.getByRole('button', { name: /議事録を生成/ }))

    await waitFor(() => {
      expect(screen.getByText(/定例ミーティング/)).toBeInTheDocument()
    })
  })
})
