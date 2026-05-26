import { downloadFile } from '@/lib/export'

test('downloadFile creates and clicks an anchor element', () => {
  const clickMock = jest.fn()
  const revokeMock = jest.fn()
  global.URL.createObjectURL = jest.fn(() => 'blob:mock')
  global.URL.revokeObjectURL = revokeMock

  const appendSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((el) => {
    ;(el as HTMLAnchorElement).click = clickMock
    return el
  })
  jest.spyOn(document.body, 'removeChild').mockImplementation((el) => el)

  downloadFile('hello world', 'test.md', 'text/markdown')

  expect(clickMock).toHaveBeenCalledTimes(1)
  expect(revokeMock).toHaveBeenCalledWith('blob:mock')

  appendSpy.mockRestore()
})
