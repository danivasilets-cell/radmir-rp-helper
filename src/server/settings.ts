import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { settings } from '../../db/schema.js'
import { DEFAULT_SETTINGS, type PlatformSettings } from '@/lib/settings'

export async function getAllSettings(): Promise<PlatformSettings> {
  const rows = await db.select().from(settings)
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows)
    if (
      r.key in DEFAULT_SETTINGS &&
      typeof r.value ===
        typeof DEFAULT_SETTINGS[r.key as keyof PlatformSettings]
    )
      out[r.key] = r.value
  return out as PlatformSettings
}

export async function getSetting<K extends keyof PlatformSettings>(
  key: K,
): Promise<PlatformSettings[K]> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)
  const fallback = DEFAULT_SETTINGS[key]
  return row && typeof row.value === typeof fallback
    ? (row.value as PlatformSettings[K])
    : fallback
}
