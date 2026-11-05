import { useEffect, useSyncExternalStore } from 'react'
import type { Favorite } from './favorites'

const STORAGE_KEY = 'radmir-recent'
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

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Topics viewed recently in this browser (newest first). */
export function useRecentlyViewed() {
  return useSyncExternalStore(subscribe, read, () => EMPTY)
}

/** Records a visit to a topic page. */
export function useTrackView(item: Favorite) {
  const { id, kind, title, summary, icon } = item
  useEffect(() => {
    if (kind !== 'topic') return
    const next = [
      { id, kind, title, summary, icon },
      ...read().filter((f) => f.id !== id),
    ].slice(0, 8)
    cache = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable
    }
    listeners.forEach((l) => l())
  }, [id, kind, title, summary, icon])
}
