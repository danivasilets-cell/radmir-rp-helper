import { useEffect, useState } from 'react'

/** Thin orange bar under the header showing how far the page is read. */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-gradient-to-r from-primary to-chart-5"
      style={{ transform: `scaleX(${progress})` }}
    />
  )
}
