import { useCallback, useSyncExternalStore } from 'react'
import type { NodeItem } from './types'

export type Favorite = Pick<
  NodeItem,
  'id' | 'kind' | 'title' | 'summary' | 'icon'
>

const STORAGE_KEY = 'radmir-favorites'
const EMPTY: Favorite[] = []
const listeners = new Set<() => void>()
let cache: Favorite[] | null = null

function read(): Favorite[] {
  if (cache) return cache
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    cache = Array.isArray(raw) ? (raw as Favorite[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(list: Favorite[]) {
  cache = list
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // storage unavailable — keep in memory for this tab
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Favorites saved in this browser. Empty on the server and first render. */
export function useFavorites() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY)
  const toggle = useCallback((item: Favorite) => {
    const current = read()
    const exists = current.some((f) => f.id === item.id)
    write(
      exists
        ? current.filter((f) => f.id !== item.id)
        : [
            {
              id: item.id,
              kind: item.kind,
              title: item.title,
              summary: item.summary,
              icon: item.icon,
            },
            ...current,
          ].slice(0, 200),
    )
    return !exists
  }, [])
  const remove = useCallback(
    (id: number) => write(read().filter((f) => f.id !== id)),
    [],
  )
  return {
    list,
    toggle,
    remove,
    has: (id: number) => list.some((f) => f.id === id),
  }
}

/** Favorites saved in this browser, read once (client only). */
export function readLocalFavorites(): Favorite[] {
  if (typeof window === 'undefined') return []
  return read()
}
