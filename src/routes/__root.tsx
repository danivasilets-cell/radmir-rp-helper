import { useEffect } from 'react'
import {
  HeadContent,
  Scripts,
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { getBootstrap } from '@/lib/api.functions'
import { trackVisit } from '@/lib/admin.functions'
import { DEFAULT_SETTINGS } from '@/lib/settings'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'
import { SiteStub } from '@/components/app/site-stub'

import { themeInitScript } from '@/lib/theme'

import '../styles.css'

const siteName = 'Radmir Helper — помощник по Радмир РП'
const siteDescription =
  'Идеи для РП, отыгровки и гайды для организаций Радмир РП: МВД, ГИБДД, ФСБ, армия, больница, СМИ и не только.'

export const Route = createRootRoute({
  beforeLoad: async () => {
    try {
      return await getBootstrap()
    } catch {
      return {
        session: null,
        navSections: [],
        servers: [],
        serverId: null,
        siteMode: 'online' as const,
        siteLocked: false,
        announcement: '',
        settings: DEFAULT_SETTINGS,
        pendingIdeas: 0,
        openReports: 0,
      }
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/png', href: '/logo.png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Russo+One&display=swap&subset=cyrillic',
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <VisitTracker />
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}

/** Shows the maintenance / disabled stub instead of the page when locked.
 * The login page stays open so the team can sign in. */
function RootComponent() {
  const { siteLocked, siteMode, settings } = Route.useRouteContext()
  const path = useRouterState({ select: (s) => s.location.pathname })
  if (siteLocked && path !== '/login')
    return (
      <SiteStub
        mode={siteMode === 'disabled' ? 'disabled' : 'maintenance'}
        message={settings.siteModeMessage}
      />
    )
  return <Outlet />
}

/** Sends one anonymous page view per navigation (for the admin stats). */
function VisitTracker() {
  const path = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    void trackVisit({ data: { path } }).catch(() => undefined)
  }, [path])
  return null
}
