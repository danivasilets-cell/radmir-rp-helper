export type PlatformSettings = {
  registrationOpen: boolean
  commentsEnabled: boolean
  ideasEnabled: boolean
  reportsEnabled: boolean
  /** Banner text shown on every page; empty = hidden. */
  announcement: string
  /** Site stub: 'online' — works normally, 'maintenance' — tech works
   * (team can still browse), 'disabled' — site off (only the owner). */
  siteMode: string
  /** Optional text shown on the stub page. */
  siteModeMessage: string
}

export type SiteMode = 'online' | 'maintenance' | 'disabled'
export const SITE_MODES: SiteMode[] = ['online', 'maintenance', 'disabled']

export function siteModeOf(s: PlatformSettings): SiteMode {
  return (SITE_MODES as string[]).includes(s.siteMode)
    ? (s.siteMode as SiteMode)
    : 'online'
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  registrationOpen: true,
  commentsEnabled: true,
  ideasEnabled: true,
  reportsEnabled: true,
  announcement: '',
  siteMode: 'online',
  siteModeMessage: '',
}
