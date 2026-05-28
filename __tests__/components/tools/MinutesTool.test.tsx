import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('@/lib/audioChunker', () => ({
  splitAudioFile: jest.fn().mockResolvedValue([
    new File(['wav data'], 'chunk-0.wav', { type: 'audio/wav' }),
  ]),
}))

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

describe('MinutesTool - 音声入力UI', () => {
  beforeEach(() => jest.clearAllMocks())

  it('音声アップロードゾーンが表示される', () => {
    render(<MinutesTool />)
    expect(screen.getByText(/音声ファイルをここにドロップ/)).toBeInTheDocument()
  })

  it('ファイル選択後にファイル名と文字起こし開始ボタンが表示される', async () => {
    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    const file = new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(await screen.findByText('meeting.m4a')).toBeInTheDocument()
    expect(screen.getByText('🔤 文字起こし開始')).toBeInTheDocument()
  })

  it('✕ボタンでファイルがクリアされる', async () => {
    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    const file = new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(await screen.findByText('✕'))
    expect(screen.queryByText('meeting.m4a')).not.toBeInTheDocument()
  })

  it('文字起こし開始を押すとテキストエリアに結果が入る', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ text: '文字起こし結果のテキストです。' }),
    } as Response)

    render(<MinutesTool />)
    const input = screen.getByTestId('audio-file-input')
    fireEvent.change(input, { target: { files: [new File(['audio'], 'meeting.m4a', { type: 'audio/mp4' })] } })
    fireEvent.click(await screen.findByText('🔤 文字起こし開始'))

    const textarea = screen.getByPlaceholderText(/文字起こし/)
    expect(await screen.findByDisplayValue('文字起こし結果のテキストです。')).toBe(textarea)
  })
})
