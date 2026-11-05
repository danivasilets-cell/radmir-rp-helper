import { can, type Permission, type Role } from './permissions'

export type NodeKind = 'section' | 'topic'

export type NodeItem = {
  id: number
  parentId: number | null
  kind: NodeKind
  title: string
  summary: string
  icon: string
  sortOrder: number
  childCount: number
  serverId?: number | null
}

export type NodeFull = NodeItem & {
  content: string
  createdBy: string
  updatedAt: string
}

export type SessionInfo = {
  role: Role
  label: string
  /** Set when signed in with a player account (any role). */
  userId: number | null
} | null

/** Moderator, admin or owner — the site team. */
export const isTeam = (s: SessionInfo) => !!s && s.role !== 'user'

/** Signed in with a player account (has a personal cabinet). */
export const isPlayer = (
  s: SessionInfo,
): s is NonNullable<SessionInfo> & { userId: number } =>
  !!s && s.userId !== null

/** UI check; the server re-checks every permission. */
export const allowed = (s: SessionInfo, permission: Permission) =>
  can(s?.role, permission)

export type GameServer = {
  id: number
  name: string
  description: string
  active: boolean
  sortOrder: number
}

export type Organization = {
  id: number
  name: string
  kind: string
  description: string
  leader: string
  serverId: number | null
  sortOrder: number
}

export type GameCommand = {
  id: number
  command: string
  description: string
  usage: string
  category: string
  serverId: number | null
}

export type RoleplayKind = 'action' | 'scenario'

export type Roleplay = {
  id: number
  kind: RoleplayKind
  title: string
  category: string
  content: string
  organizationId: number | null
  organizationName: string | null
  serverId: number | null
  createdBy: string
}

export type CommentItem = {
  id: number
  text: string
  authorName: string
  authorRole: string
  userId: number | null
  createdAt: string
}

export type IdeaStatus = 'pending' | 'approved' | 'rejected'

export type IdeaItem = {
  id: number
  title: string
  summary: string
  content: string
  status: IdeaStatus
  reviewNote: string
  reviewedBy: string
  nodeId: number | null
  sectionId: number | null
  sectionTitle: string | null
  author: string
  createdAt: string
}

export type EventTable = {
  id: number
  title: string
  description: string
  columns: string[]
  rows: string[][]
  serverId?: number | null
  createdBy: string
  updatedAt: string
}

export type EventPrize = {
  id: number
  title: string
  reward: string
  description: string
  /** YYYY-MM-DD or null */
  eventDate: string | null
  winner: string
  serverId?: number | null
  createdBy: string
}

export type NavSection = { id: number; title: string; icon: string }

export type Car = {
  id: number
  modelId: number
  name: string
  carClass: string
  /** Price in rubles; null = individual price. */
  price: number | null
  dealership: string
  maxSpeed: number
  acceleration: number
  seats: number
  trunk: number
  fuelTank: number
  drive: string
  /** '92' | '95' | '98' | 'DT' | 'electric' | '' */
  fuelType: string
  description: string
  /** Photo key in Blobs ('' = no photo). */
  image: string
  serverId?: number | null
}

export type QuickLink = {
  id: number
  title: string
  text: string
  url: string
  icon: string
}

export type NewsItem = {
  id: number
  title: string
  body: string
  pinned: boolean
  serverId: number | null
  authorLabel: string
  /** Blob keys, served from `/api/news-images/<key>`. */
  images: string[]
  createdAt: string
}
