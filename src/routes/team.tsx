import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old owner page — moved into the admin panel. */
export const Route = createFileRoute('/team')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/roles' })
  },
})
