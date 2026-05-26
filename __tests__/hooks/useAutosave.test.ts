// __tests__/hooks/useAutosave.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAutosave } from '@/hooks/useAutosave'

beforeEach(() => {
  localStorage.clear()
  jest.useFakeTimers()
})
afterEach(() => jest.useRealTimers())

test('saves to localStorage after 500ms debounce', () => {
  const { rerender } = renderHook(({ value }) => useAutosave('test-tool', value), {
    initialProps: { value: 'initial' },
  })
  rerender({ value: 'updated' })
  expect(localStorage.getItem('3new-studio:content:test-tool')).toBeNull()
  act(() => jest.advanceTimersByTime(500))
  expect(localStorage.getItem('3new-studio:content:test-tool')).toBe('"updated"')
})

test('loads initial value from localStorage', () => {
  localStorage.setItem('3new-studio:content:my-tool', JSON.stringify('saved content'))
  const { result } = renderHook(() => useAutosave('my-tool', ''))
  expect(result.current.savedValue).toBe('saved content')
})
