// hooks/useAutosave.ts
import { useEffect, useState } from 'react'
import { saveToStorage, loadFromStorage } from '@/lib/storage'

export function useAutosave(toolId: string, value: string) {
  const storageKey = `content:${toolId}`
  const [savedValue] = useState<string>(() => loadFromStorage<string>(storageKey) ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      saveToStorage(storageKey, value)
    }, 500)
    return () => clearTimeout(timer)
  }, [value, storageKey])

  return { savedValue }
}
