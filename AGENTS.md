# AGENTS.md

This document describes the project for developers and AI agents working on this codebase.

## Project Overview

Radmir Helper — a Russian-language helper site for the Radmir RP game server (RP ideas and guides for factions).

- Content is one tree in the `nodes` table (`db/schema.ts`): `section` nodes hold children, `topic` nodes hold text; any node can have sub-items.
- Roles (`src/lib/permissions.ts`): guest < user < moderator < admin < owner. `PERMISSIONS` maps each permission to a minimum role; every write server function calls `requirePermission()` from `src/server/auth.ts` (UI uses `allowed(session, perm)` only to hide controls). Moderator: review publications, delete violating topics/comments/ideas, handle reports. Admin: manage content, users, catalog (cars, commands, RP), events, organizations. Owner: roles, servers, platform settings, audit log.
- Roles come from `users.role` (player accounts) or `moderators.role` (access keys issued on `/admin/roles`); the owner signs in with `OWNER_PASSWORD` or a password they set on `/admin/settings` (scrypt hash in `settings` key `ownerPassword`, valid only while `OWNER_PASSWORD` is unchanged, so changing the env var resets it; `src/lib/owner.functions.ts`). `currentSession()` reads roles live, so bans/role changes apply immediately. Logins are rate limited (`auth_attempts`), registration has a password policy (`src/lib/password.ts`) and a honeypot.
- Sessions are hashed tokens in the `sessions` table with an httpOnly cookie. `logAction()` writes `activity_log` (user history in the cabinet + owner audit log).
- Game servers (`game_servers`, managed on `/admin/servers`): `nodes`, `cars`, `event_tables`, `event_prizes`, `organizations`, `game_commands`, `roleplays` have nullable `server_id` (null = all servers). The choice is stored in the `rh_server` cookie and `users.server_id`; queries filter with `serverScope(column)` from `src/server/servers.ts`.
- Root `beforeLoad` calls `getBootstrap()` → context `session`, `navSections`, `servers`, `serverId`, `settings`, `announcement`, `pendingIdeas`, `openReports`. Platform settings live in the `settings` table (`src/lib/settings.ts`).
- Site stub: settings `siteMode` (`online` | `maintenance` | `disabled`) + `siteModeMessage`, set on `/admin/settings`. `getBootstrap()` returns `siteLocked`; the root `component` renders `SiteStub` instead of the page (except `/login`). Maintenance lets moderators+ through, disabled only the owner.
- Personal cabinet `/me` (`src/lib/account.functions.ts`): profile + server, favorite articles/cars, saved roleplays/scenarios (`saved_roleplays`), publications, activity, password change, sessions, account deletion. Reports (`reports`) are sent via `ReportButton`.
- Admin panel `/admin/*` (`src/lib/admin.functions.ts`, `src/lib/catalog.functions.ts`): overview with visit stats (`page_views`, `daily_visitors`, anonymous), reports, publications, materials, users, roles, orgs, cars, commands, roleplays, events, servers, settings, audit. Important deletions require typing the name (`ConfirmDelete confirmText`).
- Events live in their own tables (`event_tables` with jsonb columns/rows, `event_prizes`); server functions in `src/lib/events.functions.ts`. Moderators and the owner can add, edit and delete them.
- Home page online widget (`src/components/app/online-widget.tsx`, `src/lib/online.functions.ts`): total Radmir online from the crmp.samp-sc.com monitor (group 4 JSON), cached 60 s on the server, refreshed every minute in the browser.
- Home page news (`news` table, `src/lib/news.functions.ts`, `src/components/app/news-panel.tsx`): right-hand column on xl screens, posted/edited/deleted by moderator+ (`news.manage`), optional pin and server. Up to 6 photos per post: files live in Netlify Blobs store `news-images` (`src/server/news-images.ts`), keys in `news.images` (jsonb); uploaded via `POST /api/news-images`, served by `GET /api/news-images/$key`; removed photos are deleted from Blobs on save/delete.
- Topic/idea text editor (`src/components/app/content-editor.tsx`): toolbar for bold (Ctrl+B), heading, list and photos. Photos (any signed-in account) upload via `POST /api/topic-images` to Blobs store `topic-images`, are served by `GET /api/topic-images/$key` and are inserted into the text as `![фото](/api/topic-images/<key>)` lines; `RichText` renders only site-hosted image URLs, grouping consecutive ones into a gallery.
- Header menu: «Разделы» (root sections from root `beforeLoad` context `navSections`) and «Ивенты» dropdowns; mobile uses a Sheet.
- Community (`src/lib/community.functions.ts`): player accounts (`users`, nickname + scrypt password, session role `user`), RP ideas (`ideas`, moderated on `/ideas`, approval creates a topic), `comments`, 1–5 `ratings`, account `favorites`. Use `isPlayer()` for account features and `allowed()` for team controls.
- Favorites: guests keep them in localStorage (`src/lib/favorites.ts`), players in the `favorites` table; browser favorites are imported on player login.
- Vehicle catalog (`src/lib/cars.functions.ts`, helpers in `src/lib/cars.ts`): `cars` table with in-game `model_id` (not unique: one vehicle can be listed under several sources), class tab (`CAR_CLASSES`: economy, comfort, premium, truck, moto, water, air, camper, exclusive), price (null = «Индивидуально») and stats. For exclusives `dealership` holds the source (`EXCLUSIVE_SOURCES`: Контейнеры, Крафт, Рулетка, Кейсы, Донат, Пропуск, Лавка обмена); the tab is split by source. Photo key in `cars.image` → Blobs store `car-images`, uploaded via `POST /api/car-images` (catalog.manage), served by `GET /api/car-images/$key`; old photos are deleted on replace/delete. Team can add/edit/delete and upload a photo from the card or editor. `/cars` filters client-side with URL search params (q, cls, min, max, sort, view) and compares up to 3 cars.
- Routes: `/` sections, `/cars`, `/roleplays`, `/commands`, `/orgs`, `/me`, `/admin/*` (`/team` redirects to `/admin/roles`), `/n/$id` node page, `/search`, `/login`, `/team`, `/events`, `/events/tables`, `/events/prizes`, `/favorites`, `/community`, `/ideas/new`, `/ideas` (team), `/u/$nickname`.

### Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | TanStack Start                                      |
| Frontend      | React 19, TanStack Router                           |
| Build         | Vite 8                                              |
| Styling       | Tailwind CSS 4, theme variables in `src/styles.css` |
| UI Components | shadcn/ui (Radix UI + Tailwind)                     |
| Toasts        | sonner                                              |
| Icons         | lucide-react                                        |
| Language      | TypeScript 6.0 (strict mode)                        |
| Deployment    | Netlify, via `@netlify/vite-plugin-tanstack-start`  |

## Directory Structure

```
├── public
│   └── favicon.ico
├── src
│   ├── components
│   │   ├── error-pages.tsx # Themed 404 and route error pages with home/retry actions.
│   │   └── ui          # shadcn/ui controls, overlays, feedback, forms, and tables.
│   ├── examples
│   │   └── validated-form.tsx # Unmounted form pattern with validation, pending, error, and success states.
│   ├── lib
│   │   └── utils.ts    # cn() helper for merging Tailwind classes.
│   ├── routes
│   │   ├── __root.tsx  # HTML shell, <head> metadata (siteName, siteDescription), the tooltip provider, and the toast container.
│   │   └── index.tsx   # Home route (/): placeholder page to replace.
│   ├── router.tsx      # Creates the router from the generated route tree.
│   └── styles.css      # Tailwind import, theme variables for light and dark mode, base styles.
├── components.json     # shadcn/ui config, used by `npx shadcn add`.
├── netlify.toml        # Build command, publish directory, dev server ports.
├── package.json
├── tsconfig.json
└── vite.config.ts      # Vite path aliases and Tailwind, Netlify, TanStack Start, React plugins.
```

`src/routeTree.gen.ts` is generated by the router plugin when the dev server or build runs. Don't edit it.

Shared framework skill source lives in `frameworks/tanstack-start-react/.claude/skills` in this repository, separate from the standalone starter. Consult the matching framework/Netlify skills when available in a generated app; don't assume the starter contains a `.claude` directory.

## Key Concepts

### File-Based Routing

Route files in `src/routes/` define pages and endpoints:

- `__root.tsx` wraps every page.
- `index.tsx` is `/`.
- `about.tsx` would be `/about`.
- `api.*.ts` files are server API endpoints. See the `tanstack-start-api-routes` skill.

### Theme Variables

Colors and corner radius are CSS variables in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--radius`, and more), with a second set under `.dark`. Tailwind exposes them as classes such as `bg-primary`, `text-muted-foreground`, and `border-border`.

Set these variables for the product before you build any page. In components, use the variable classes instead of raw colors like `bg-white` or `text-gray-600`, so the whole site changes when a variable changes.

### UI Components

Ready-made components are in `src/components/ui/`. Use them before writing your own, and restyle them through the theme variables or their variants. Add more with `npx shadcn add <name>`. Show a toast by calling `toast()` from `sonner`; the container is already mounted in `__root.tsx`. `TooltipProvider` is mounted there too, so `Tooltip` works anywhere without its own provider.

| Need               | Components                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Actions and status | Button, Badge, Progress, Skeleton, Alert, Sonner                   |
| Forms              | Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, Form |
| Overlays and menus | Dialog, Sheet, Popover, DropdownMenu, Tooltip                      |
| Content and layout | Card, Tabs, Accordion, Separator, Table                            |

Use `Form` with React Hook Form and the Zod resolver. Start from `src/examples/validated-form.tsx`; it isn't mounted or connected to a backend. Its required `onSubmit` callback must reject on failure. See [the form pattern](docs/forms.md) for HTTP submission and error handling.

Use Sheet for a mobile menu and DropdownMenu for short action lists. Give Dialog and Sheet an accessible title and description. Pair Checkbox, RadioGroup, Switch, and inputs with visible labels. Reserve tables for tabular data and wrap them in their provided scroll container.

### Design Choices

Set the product's palette, heading/body fonts, and layout before building its screens. Use an explicit user design when supplied; otherwise choose defaults that fit the product. Keep Basic's placeholder until you replace it with the requested product.

- Set `--font-body` and `--font-heading` in `src/styles.css`. Use `font-display` for headings when the product needs a separate heading font.
- Use `max-w-content` for a page container and `max-w-reading` for long text. Keep consistent horizontal padding, such as `px-4 sm:px-6`, and a small repeated spacing scale, such as `gap-4`, `gap-6`, and `py-12`.
- Keep one main heading per page and a clear heading order. Use muted text for supporting copy, not essential low-contrast labels.
- Preserve focus rings. Give icon-only buttons an accessible name. Ensure actions work with a keyboard and on narrow screens.
- Use short color/opacity transitions. Add `motion-reduce:transition-none` or `motion-reduce:animate-none` when adding motion; don't make essential content depend on animation.
- Provide loading, empty, error, and success states for each data-driven screen. Skeletons should follow the shape of the content they replace.

### Routing and Server Data

Router types are registered in `src/router.tsx`, so use typed `Link` destinations and route parameters. The root route supplies the themed 404 page; the router's default error component supplies the safe retry/home page, including child-route SSR failures. Use `throw notFound()` for absent records; keep unexpected failures on the error path. See [routing conventions](src/routes/README.md).

Start with route loaders and server functions for server data. Validate server-function input with `.validator(...)`, keep secrets on the server, and handle HTTP failures before returning data. See [the data-fetching pattern](docs/data-fetching.md). Add TanStack Query only when client-side caching, mutations, or background refresh are needed.

### Browser Storage

Pages are rendered on the server first, where `window` and `localStorage` don't exist. Read `localStorage` inside `useEffect`, not during render or in a `useState` initializer, or the first render will differ from the server HTML and React will log a hydration error.

## Configuration Files

| File             | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `vite.config.ts` | Vite path aliases and Tailwind, Netlify, TanStack Start, React plugins                           |
| `tsconfig.json`  | Strict TypeScript, with the `@/*` alias for `src/*`                                              |
| `netlify.toml`   | Builds with `vite build`, publishes `dist/client`, dev server on port 8888 proxying Vite on 3000 |

## Development Commands

Use Node 22.13+ on the Node 22 line, Node 24, or Node 26+. The installed lint and test tools set this minimum alongside the framework.

```bash
npm run dev        # Start the Vite dev server on port 3000
npm run build      # Production build
npm run typecheck  # Type-check with tsc; the build doesn't
npm run lint       # Check TypeScript and React Hooks rules
npm run format:check # Check formatting
npm run format     # Format project files
npm test           # Run local form, control, and error page tests
npm run preview    # Preview the production build
```

## Conventions

- Components: PascalCase. Utilities and hooks: camelCase. Route files: kebab-case.
- Import from `src` with the `@/` alias.
- TypeScript fails on unused locals and parameters, so remove what you don't use.
- Use React hooks for state.
- Run the dev server or build once to generate route types before type-checking a fresh copy.
- Run build, typecheck, lint, format:check, and tests before reporting completion. Verify changed user flows locally; a passing build doesn't prove an interaction works.

## Application Name

Set the product's name and description in `src/routes/__root.tsx`:

- `siteName` is the page title and the title shown when the link is shared.
- `siteDescription` is the meta description and the description shown when the link is shared.

Then replace the placeholder heading and text in `src/routes/index.tsx`.
