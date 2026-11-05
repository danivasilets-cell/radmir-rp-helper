import { createServerFn } from '@tanstack/react-start'

import {
  MONITOR,
  MONITOR_GROUP_ID as GROUP_ID,
  SLOTS_PER_SERVER,
  type OnlineServer,
  type OnlineStats,
} from './online'

const CACHE_MS = 60_000

let cached: { at: number; data: OnlineStats } | null = null

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 }
function romanValue(name: string) {
  const s = name.trim().toUpperCase()
  if (!/^[IVXL]+$/.test(s)) return 999
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]]
    const next = ROMAN[s[i + 1]] ?? 0
    total += cur < next ? -cur : cur
  }
  return total
}

async function fetchMonitor(): Promise<OnlineStats> {
  const res = await fetch(
    `${MONITOR}/cache/graph_g${GROUP_ID}.json?${Math.floor(Date.now() / 1000)}`,
    {
      headers: { 'user-agent': 'Mozilla/5.0 (Radmir Helper online widget)' },
      signal: AbortSignal.timeout(8000),
    },
  )
  if (!res.ok) throw new Error(`monitor HTTP ${res.status}`)
  const raw = (await res.json()) as unknown
  if (!Array.isArray(raw)) throw new Error('monitor: unexpected response')
  const servers: OnlineServer[] = raw
    .map((r: { name?: unknown; players?: unknown }) => ({
      name: String(r?.name ?? '').slice(0, 40),
      players: Math.max(0, Math.floor(Number(r?.players) || 0)),
    }))
    .filter((s) => s.name)
    .sort((a, b) => romanValue(a.name) - romanValue(b.name))
  if (servers.length === 0) throw new Error('monitor: no servers')
  return {
    total: servers.reduce((sum, s) => sum + s.players, 0),
    servers,
    slots: servers.length * SLOTS_PER_SERVER,
    updatedAt: new Date().toISOString(),
  }
}

/** Total Radmir RP online from the CRMP monitoring, cached for a minute. */
export const getOnline = createServerFn({ method: 'GET' }).handler(
  async (): Promise<OnlineStats | null> => {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.data
    try {
      const data = await fetchMonitor()
      cached = { at: Date.now(), data }
      return data
    } catch (err) {
      console.error('online monitor failed', err)
      // Keep showing the last known numbers for a while.
      if (cached && Date.now() - cached.at < 30 * 60_000) return cached.data
      return null
    }
  },
)
