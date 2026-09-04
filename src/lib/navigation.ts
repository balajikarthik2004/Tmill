import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Wrench,
} from 'lucide-react'

export interface NavLeaf {
  label: string
  path: string
}

export interface NavSection {
  label: string
  icon: LucideIcon
  path?: string
  children?: NavLeaf[]
}

/**
 * Navigation covers only what Thiagarajar Mills actually operates per tmills.com:
 * cotton intake, three spinning mills, OE/post-spinning, weaving, the Central
 * Testing Laboratory, and the export-led order book.
 */
export const navTree: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Sales & Orders',
    icon: ShoppingCart,
    children: [
      { label: 'Customers', path: '/sales/customers' },
      { label: 'Sales Orders', path: '/sales/sales-orders' },
      { label: 'Export Orders', path: '/sales/export-orders' },
      { label: 'Dispatch', path: '/sales/dispatch' },
    ],
  },
  {
    label: 'Planning',
    icon: ClipboardList,
    children: [
      { label: 'Production Orders', path: '/planning/production-orders' },
      { label: 'Capacity Planning', path: '/planning/capacity-planning' },
    ],
  },
  {
    label: 'Procurement',
    icon: Package,
    children: [
      { label: 'Suppliers', path: '/procurement/suppliers' },
      { label: 'Purchase Requisitions', path: '/procurement/pr' },
      { label: 'Purchase Orders', path: '/procurement/po' },
      { label: 'GRN', path: '/procurement/grn' },
    ],
  },
  {
    label: 'Cotton & Raw Materials',
    icon: Sprout,
    children: [
      { label: 'Cotton Lots', path: '/cotton/cotton-lots' },
      { label: 'Cotton Testing', path: '/cotton/cotton-testing' },
      { label: 'Traceability', path: '/cotton/traceability' },
    ],
  },
  {
    label: 'Inventory',
    icon: Boxes,
    children: [
      { label: 'Raw Materials', path: '/inventory/raw-materials' },
      { label: 'WIP', path: '/inventory/wip' },
      { label: 'Finished Goods', path: '/inventory/finished-goods' },
      { label: 'Stock Movements', path: '/inventory/stock-movements' },
    ],
  },
  {
    label: 'Production',
    icon: Factory,
    children: [
      { label: 'Overview', path: '/production' },
      { label: 'Blow Room', path: '/production/blow-room' },
      { label: 'Carding', path: '/production/carding' },
      { label: 'Combing', path: '/production/combing' },
      { label: 'Drawing', path: '/production/drawing' },
      { label: 'Roving', path: '/production/roving' },
      { label: 'Ring Spinning', path: '/production/ring-spinning' },
      { label: 'Open End', path: '/production/open-end' },
      { label: 'Winding', path: '/production/winding' },
      { label: 'TFO', path: '/production/tfo' },
      { label: 'Gassing', path: '/production/gassing' },
      { label: 'Weaving', path: '/production/weaving' },
    ],
  },
  {
    label: 'Quality Management',
    icon: ShieldCheck,
    children: [
      { label: 'Dashboard', path: '/quality/dashboard' },
      { label: 'Lab Tests', path: '/quality/lab-tests' },
      { label: 'Cotton Quality', path: '/quality/cotton-quality' },
      { label: 'Yarn Quality', path: '/quality/yarn-quality' },
      { label: 'Fabric Quality', path: '/quality/fabric-quality' },
      { label: 'Rejections', path: '/quality/rejections' },
      { label: 'Complaints', path: '/quality/complaints' },
    ],
  },
  {
    label: 'Maintenance',
    icon: Wrench,
    children: [
      { label: 'Machine Dashboard', path: '/maintenance/machine-dashboard' },
      { label: 'Preventive Maintenance', path: '/maintenance/pm' },
      { label: 'Breakdowns', path: '/maintenance/breakdown' },
      { label: 'Spare Parts', path: '/maintenance/spare-parts' },
    ],
  },
  {
    label: 'Master Data',
    icon: Gauge,
    children: [
      { label: 'Products', path: '/master/products' },
      { label: 'Customers', path: '/master/customers' },
      { label: 'Suppliers', path: '/master/suppliers' },
      { label: 'Machines', path: '/master/machines' },
      { label: 'Cotton Lots', path: '/master/cotton-lots' },
    ],
  },
  { label: 'Administration', icon: Settings, path: '/admin' },
]

export interface FlatNavEntry {
  label: string
  path: string
  sectionLabel: string
}

export const flatNavEntries: FlatNavEntry[] = navTree.flatMap((section) => {
  if (section.path) {
    return [{ label: section.label, path: section.path, sectionLabel: section.label }]
  }
  return (section.children ?? []).map((child) => ({
    label: child.label,
    path: child.path,
    sectionLabel: section.label,
  }))
})
