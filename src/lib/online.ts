/** Radmir RolePlay group on the CRMP monitoring (crmp.samp-sc.com). */
export const MONITOR = 'https://crmp.samp-sc.com'
export const MONITOR_GROUP_ID = 4
export const MONITOR_URL = `${MONITOR}/group?id=${MONITOR_GROUP_ID}`
/** Player slots on one Radmir server. */
export const SLOTS_PER_SERVER = 1000

export type OnlineServer = { name: string; players: number }
export type OnlineStats = {
  total: number
  servers: OnlineServer[]
  slots: number
  updatedAt: string
}
