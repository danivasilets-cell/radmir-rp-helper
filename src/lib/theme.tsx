import { useCallback, useEffect, useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'radmir-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Inline script for <head>: applies the saved theme before the first paint,
 * so the page doesn't flash the wrong colors. Dark is the default.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'dark';var d=t==='dark'||(t==='system'&&window.matchMedia('${DARK_QUERY}').matches);document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`

const listeners = new Set<() => void>()

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system')
      return saved
  } catch {
    // storage unavailable
  }
  return 'dark'
}

function resolve(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', callback)
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    media.removeEventListener('change', callback)
    window.removeEventListener('storage', callback)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readChoice,
    () => 'dark' as const,
  )
  const resolved = useSyncExternalStore(
    subscribe,
    () => resolve(readChoice()),
    () => 'dark' as const,
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const setTheme = useCallback((choice: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // storage unavailable
    }
    document.documentElement.classList.toggle(
      'dark',
      resolve(choice) === 'dark',
    )
    listeners.forEach((l) => l())
  }, [])

  return { theme, resolved, setTheme }
}
