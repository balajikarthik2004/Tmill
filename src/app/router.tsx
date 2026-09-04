import { createBrowserRouter } from 'react-router-dom'

import { Shell } from '@/components/layout/Shell'
import { ComingSoonPage } from '@/components/common/ComingSoonPage'
import { flatNavEntries } from '@/lib/navigation'
import ExecutiveDashboard from '@/pages/dashboard/ExecutiveDashboard'
import SalesOrders from '@/pages/sales/SalesOrders'
import Administration from '@/pages/admin/Administration'

/** Routes backed by real pages — every other nav leaf renders a branded
 *  placeholder so the whole navigation tree still resolves. */
const implementedPaths = new Set(['/', '/sales/sales-orders', '/admin'])

const stubRoutes = flatNavEntries
  .filter((entry) => !implementedPaths.has(entry.path))
  .map((entry) => ({
    path: entry.path,
    element: (
      <ComingSoonPage
        title={entry.label}
        description={`${entry.label} is part of the ${entry.sectionLabel} module and is being built out next.`}
      />
    ),
  }))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ExecutiveDashboard /> },
      { path: 'sales/sales-orders', element: <SalesOrders /> },
      { path: 'admin', element: <Administration /> },
      ...stubRoutes,
    ],
  },
])
