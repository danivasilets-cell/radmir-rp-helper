/**
 * Roles and permissions shared by the server (enforcement) and the UI
 * (hiding controls). The server is the source of truth: every write server
 * function calls `requirePermission()` from `src/server/auth.ts`.
 */
export const ROLES = ['user', 'moderator', 'admin', 'owner'] as const
export type Role = (typeof ROLES)[number]

/** Roles the owner can give to a player account or an access key. */
export const ASSIGNABLE_ROLES = ['user', 'moderator', 'admin'] as const
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  owner: 3,
}

export const ROLE_LABELS: Record<Role, string> = {
  user: 'Игрок',
  moderator: 'Модератор',
  admin: 'Администратор',
  owner: 'Владелец',
}

export const PERMISSIONS = {
  'publications.review': { min: 'moderator', label: 'Проверка публикаций' },
  'content.moderate': {
    min: 'moderator',
    label: 'Удаление материалов, нарушающих правила',
  },
  'reports.handle': { min: 'moderator', label: 'Работа с жалобами' },
  'news.manage': { min: 'moderator', label: 'Публикация новостей' },
  'content.manage': { min: 'admin', label: 'Управление материалами' },
  'users.manage': { min: 'admin', label: 'Управление пользователями' },
  'catalog.manage': {
    min: 'admin',
    label: 'Редактирование каталога (авто, команды, отыгровки)',
  },
  'events.manage': {
    min: 'admin',
    label: 'Управление мероприятиями и призами',
  },
  'orgs.manage': { min: 'admin', label: 'Управление организациями' },
  'roles.manage': { min: 'owner', label: 'Назначение ролей' },
  'servers.manage': { min: 'owner', label: 'Управление серверами' },
  'settings.manage': { min: 'owner', label: 'Настройки платформы' },
  'audit.view': { min: 'owner', label: 'Журнал действий' },
} as const satisfies Record<string, { min: Role; label: string }>

export type Permission = keyof typeof PERMISSIONS

export function hasRole(role: Role | null | undefined, minimum: Role) {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export function can(role: Role | null | undefined, permission: Permission) {
  return hasRole(role, PERMISSIONS[permission].min)
}

export const asRole = (value: string): Role =>
  (ROLES as readonly string[]).includes(value) ? (value as Role) : 'user'
