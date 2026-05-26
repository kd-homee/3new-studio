import { saveToStorage, loadFromStorage } from '@/lib/storage'

beforeEach(() => localStorage.clear())

test('saveToStorage writes JSON to localStorage', () => {
  saveToStorage('test-key', { hello: 'world' })
  expect(JSON.parse(localStorage.getItem('3new-studio:test-key')!)).toEqual({ hello: 'world' })
})

test('loadFromStorage returns parsed value', () => {
  localStorage.setItem('3new-studio:test-key', JSON.stringify({ x: 1 }))
  expect(loadFromStorage('test-key')).toEqual({ x: 1 })
})

test('loadFromStorage returns null for missing key', () => {
  expect(loadFromStorage('missing')).toBeNull()
})
