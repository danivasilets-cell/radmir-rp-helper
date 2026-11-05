import {
  type AnyPgColumn,
  date,
  index,
  integer,
  real,
  bigint,
  boolean,
  primaryKey,
  uniqueIndex,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * RADMIR RP game servers. New servers are added by the owner in the admin
 * panel; any content row with `server_id = null` applies to every server.
 */
export const gameServers = pgTable('game_servers', {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text().notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean().notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * One tree for all content. A node is either a "section" (can hold children)
 * or a "topic" (an RP idea / article). Both can have children so the owner
 * can build any structure: sections → subsections → topics → sub-items.
 */
export const nodes = pgTable('nodes', {
  id: serial().primaryKey(),
  parentId: integer('parent_id').references((): AnyPgColumn => nodes.id, {
    onDelete: 'cascade',
  }),
  kind: text().notNull().default('topic'), // 'section' | 'topic'
  title: text().notNull(),
  summary: text().notNull().default(''),
  content: text().notNull().default(''),
  icon: text().notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  /** null = the same on every server */
  serverId: integer('server_id').references(() => gameServers.id, {
    onDelete: 'set null',
  }),
  createdBy: text('created_by').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Access keys the owner issues to moderators. Only the SHA-256 hash is stored. */
export const moderators = pgTable('moderators', {
  id: serial().primaryKey(),
  name: text().notNull(),
  keyHash: text('key_hash').notNull().unique(),
  /** 'moderator' | 'admin' */
  role: text().notNull().default('moderator'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Player accounts (community). Password is stored as a salted scrypt hash. */
export const users = pgTable(
  'users',
  {
    id: serial().primaryKey(),
    nickname: text().notNull(),
    passwordHash: text('password_hash').notNull(),
    faction: text().notNull().default(''),
    /** Legacy free-text server; `serverId` is used from now on. */
    server: text().notNull().default(''),
    serverId: integer('server_id').references(() => gameServers.id, {
      onDelete: 'set null',
    }),
    bio: text().notNull().default(''),
    /** 'user' | 'moderator' | 'admin' (owner signs in with a password) */
    role: text().notNull().default('user'),
    bannedAt: timestamp('banned_at'),
    banReason: text('ban_reason').notNull().default(''),
    lastSeenAt: timestamp('last_seen_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_nickname_lower').on(sql`lower(${t.nickname})`)],
)

/** Login sessions for owner / moderator modes. Token is stored hashed. */
export const sessions = pgTable('sessions', {
  id: serial().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  role: text().notNull(), // 'owner' | 'moderator'
  moderatorId: integer('moderator_id').references(() => moderators.id, {
    onDelete: 'cascade',
  }),
  /** Set for player sessions (role 'user'). */
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'cascade',
  }),
  label: text().notNull().default(''),
  expiresAt: timestamp('expires_at').notNull(),
})

/** Event tables (leaderboards, schedules, results). Editable by moderators. */
export const eventTables = pgTable('event_tables', {
  id: serial().primaryKey(),
  title: text().notNull(),
  description: text().notNull().default(''),
  columns: jsonb().$type<string[]>().notNull().default([]),
  rows: jsonb().$type<string[][]>().notNull().default([]),
  serverId: integer('server_id').references(() => gameServers.id, {
    onDelete: 'set null',
  }),
  createdBy: text('created_by').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Event prizes: what can be won, when, and who won it. */
export const eventPrizes = pgTable('event_prizes', {
  id: serial().primaryKey(),
  title: text().notNull(),
  reward: text().notNull(),
  description: text().notNull().default(''),
  eventDate: date('event_date', { mode: 'string' }),
  winner: text().notNull().default(''),
  serverId: integer('server_id').references(() => gameServers.id, {
    onDelete: 'set null',
  }),
  createdBy: text('created_by').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** RP ideas suggested by players; moderators approve them into topics. */
export const ideas = pgTable(
  'ideas',
  {
    id: serial().primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sectionId: integer('section_id').references(() => nodes.id, {
      onDelete: 'set null',
    }),
    title: text().notNull(),
    summary: text().notNull().default(''),
    content: text().notNull().default(''),
    status: text().notNull().default('pending'), // pending | approved | rejected
    reviewNote: text('review_note').notNull().default(''),
    reviewedBy: text('reviewed_by').notNull().default(''),
    nodeId: integer('node_id').references(() => nodes.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('ideas_status_idx').on(t.status),
    index('ideas_user_idx').on(t.userId),
  ],
)

/** Comments under topics. Written by players or by the team. */
export const comments = pgTable(
  'comments',
  {
    id: serial().primaryKey(),
    nodeId: integer('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    authorName: text('author_name').notNull(),
    authorRole: text('author_role').notNull().default('user'),
    text: text().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('comments_node_idx').on(t.nodeId),
    index('comments_user_idx').on(t.userId),
  ],
)

/** 1–5 star ratings, one per player per node. */
export const ratings = pgTable(
  'ratings',
  {
    nodeId: integer('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    value: integer().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.userId] })],
)

/** Favorites of logged-in players (guests keep them in the browser). */
export const favorites = pgTable(
  'favorites',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    nodeId: integer('node_id')
      .notNull()
      .references(() => nodes.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.nodeId] })],
)

/**
 * Vehicle catalog. `modelId` is the in-game vehicle ID (not unique: one vehicle
 * can be listed under several sources); `price` is in rubles (null = individual
 * price). For exclusives `dealership` holds the source (Контейнеры, Крафт…).
 */
export const cars = pgTable(
  'cars',
  {
    id: serial().primaryKey(),
    modelId: integer('model_id').notNull(),
    name: text().notNull(),
    carClass: text('car_class').notNull(),
    price: bigint({ mode: 'number' }),
    dealership: text().notNull().default(''),
    maxSpeed: integer('max_speed').notNull().default(0),
    acceleration: real().notNull().default(0),
    power: integer().notNull().default(0),
    seats: integer().notNull().default(4),
    trunk: integer().notNull().default(0),
    fuelTank: integer('fuel_tank').notNull().default(0),
    drive: text().notNull().default(''),
    /** '92' | '95' | '98' | 'DT' | 'electric' | '' (unknown). */
    fuelType: text('fuel_type').notNull().default(''),
    /** Photo key in the `car-images` Blobs store ('' = no photo). */
    image: text().notNull().default(''),
    description: text().notNull().default(''),
    serverId: integer('server_id').references(() => gameServers.id, {
      onDelete: 'set null',
    }),
    createdBy: text('created_by').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('cars_model_id_idx').on(t.modelId),
    index('cars_class_idx').on(t.carClass),
  ],
)

/** Shortcut buttons on the home page (Каталог авто, Призы, Избранное…). Owner-editable. */
export const quickLinks = pgTable('quick_links', {
  id: serial().primaryKey(),
  title: text().notNull(),
  text: text().notNull().default(''),
  url: text().notNull(),
  icon: text().notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

const serverRef = () =>
  integer('server_id').references(() => gameServers.id, {
    onDelete: 'set null',
  })

/** Factions / organizations (МВД, ФСБ, ОПГ…). */
export const organizations = pgTable('organizations', {
  id: serial().primaryKey(),
  name: text().notNull(),
  /** 'gov' | 'crime' | 'other' */
  kind: text().notNull().default('gov'),
  description: text().notNull().default(''),
  leader: text().notNull().default(''),
  serverId: serverRef(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** In-game chat commands reference (/me, /do, /try…). */
export const gameCommands = pgTable('game_commands', {
  id: serial().primaryKey(),
  command: text().notNull(),
  description: text().notNull().default(''),
  usage: text().notNull().default(''),
  category: text().notNull().default(''),
  serverId: serverRef(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Ready-made RP lines ('action' = отыгровка) and RP scenarios ('scenario'). */
export const roleplays = pgTable(
  'roleplays',
  {
    id: serial().primaryKey(),
    kind: text().notNull().default('action'),
    title: text().notNull(),
    category: text().notNull().default(''),
    content: text().notNull().default(''),
    organizationId: integer('organization_id').references(
      () => organizations.id,
      { onDelete: 'set null' },
    ),
    serverId: serverRef(),
    createdBy: text('created_by').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('roleplays_kind_idx').on(t.kind)],
)

export const savedRoleplays = pgTable(
  'saved_roleplays',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleplayId: integer('roleplay_id')
      .notNull()
      .references(() => roleplays.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleplayId] })],
)

export const favoriteCars = pgTable(
  'favorite_cars',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    carId: integer('car_id')
      .notNull()
      .references(() => cars.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.carId] })],
)

/** Player complaints about content (topics, comments, ideas, users). */
export const reports = pgTable(
  'reports',
  {
    id: serial().primaryKey(),
    reporterId: integer('reporter_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    reporterName: text('reporter_name').notNull().default(''),
    targetType: text('target_type').notNull(),
    targetId: integer('target_id').notNull(),
    targetTitle: text('target_title').notNull().default(''),
    reason: text().notNull(),
    /** 'open' | 'resolved' | 'dismissed' */
    status: text().notNull().default('open'),
    resolution: text().notNull().default(''),
    handledBy: text('handled_by').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    handledAt: timestamp('handled_at'),
  },
  (t) => [index('reports_status_idx').on(t.status)],
)

/** Everything that changes data: user activity history + owner audit log. */
export const activityLog = pgTable(
  'activity_log',
  {
    id: serial().primaryKey(),
    actorRole: text('actor_role').notNull().default('guest'),
    actorLabel: text('actor_label').notNull().default(''),
    userId: integer('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text().notNull(),
    entityType: text('entity_type').notNull().default(''),
    entityId: integer('entity_id'),
    summary: text().notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('activity_created_idx').on(t.createdAt),
    index('activity_user_idx').on(t.userId),
  ],
)

/** Page views per day and path (no personal data). */
export const pageViews = pgTable(
  'page_views',
  {
    day: date({ mode: 'string' }).notNull(),
    path: text().notNull(),
    views: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.path] })],
)

/** Unique visitors per day: hash of an anonymous random cookie. */
export const dailyVisitors = pgTable(
  'daily_visitors',
  {
    day: date({ mode: 'string' }).notNull(),
    visitorHash: text('visitor_hash').notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.visitorHash] })],
)

/** Platform settings editable by the owner (key → JSON value). */
export const settings = pgTable('settings', {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Sign-in / sign-up attempts for rate limiting (key = action + IP or nickname). */
export const authAttempts = pgTable(
  'auth_attempts',
  {
    id: serial().primaryKey(),
    key: text().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('auth_attempts_key_idx').on(t.key, t.createdAt)],
)

/** Home page news, posted by moderators and above. */
export const news = pgTable(
  'news',
  {
    id: serial().primaryKey(),
    title: text().notNull(),
    body: text().notNull().default(''),
    pinned: boolean().notNull().default(false),
    serverId: serverRef(),
    authorLabel: text('author_label').notNull().default(''),
    /** Netlify Blobs keys (store `news-images`), shown in order. */
    images: jsonb().$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('news_created_idx').on(t.createdAt)],
)
