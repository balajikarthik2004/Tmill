import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Boxes,
  ClipboardList,
  Factory,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Leaf,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  Users,
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

export const navTree: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  {
    label: 'Sales & Orders',
    icon: ShoppingCart,
    children: [
      { label: 'Customers', path: '/sales/customers' },
      { label: 'Enquiries', path: '/sales/enquiries' },
      { label: 'Quotations', path: '/sales/quotations' },
      { label: 'Sales Orders', path: '/sales/sales-orders' },
      { label: 'Export Orders', path: '/sales/export-orders' },
      { label: 'Dispatch', path: '/sales/dispatch' },
    ],
  },
  {
    label: 'Planning',
    icon: ClipboardList,
    children: [
      { label: 'Production Planning', path: '/planning/production-planning' },
      { label: 'Production Orders', path: '/planning/production-orders' },
      { label: 'Capacity Planning', path: '/planning/capacity-planning' },
    ],
  },
  {
    label: 'Procurement',
    icon: Package,
    children: [
      { label: 'Suppliers', path: '/procurement/suppliers' },
      { label: 'PR', path: '/procurement/pr' },
      { label: 'PO', path: '/procurement/po' },
      { label: 'GRN', path: '/procurement/grn' },
    ],
  },
  {
    label: 'Cotton & Raw Materials',
    icon: Sprout,
    children: [
      { label: 'Cotton Lots', path: '/cotton/cotton-lots' },
      { label: 'Cotton Inventory', path: '/cotton/cotton-inventory' },
      { label: 'Supplier Lots', path: '/cotton/supplier-lots' },
      { label: 'Cotton Testing', path: '/cotton/cotton-testing' },
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
      { label: 'PM', path: '/maintenance/pm' },
      { label: 'Breakdown', path: '/maintenance/breakdown' },
      { label: 'Spare Parts', path: '/maintenance/spare-parts' },
      { label: 'History', path: '/maintenance/history' },
    ],
  },
  {
    label: 'Energy & Sustainability',
    icon: Leaf,
    children: [
      { label: 'Dashboard', path: '/energy/dashboard' },
      { label: 'Machine Energy', path: '/energy/machine-energy' },
      { label: 'Factory Energy', path: '/energy/factory-energy' },
      { label: 'Renewable', path: '/energy/renewable' },
      { label: 'KPIs', path: '/energy/kpis' },
    ],
  },
  {
    label: 'Finance',
    icon: Banknote,
    children: [
      { label: 'Sales', path: '/finance/sales' },
      { label: 'Purchase', path: '/finance/purchase' },
      { label: 'Expenses', path: '/finance/expenses' },
      { label: 'Costing', path: '/finance/costing' },
      { label: 'Receivables', path: '/finance/receivables' },
      { label: 'Profitability', path: '/finance/profitability' },
    ],
  },
  {
    label: 'HR & Workforce',
    icon: Users,
    children: [
      { label: 'Employees', path: '/hr/employees' },
      { label: 'Shifts', path: '/hr/shifts' },
      { label: 'Attendance', path: '/hr/attendance' },
      { label: 'Allocation', path: '/hr/allocation' },
    ],
  },
  { label: 'Reports & Analytics', icon: Gauge, path: '/reports' },
  {
    label: 'Master Data',
    icon: FlaskConical,
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

/** Flat lookup used by breadcrumbs and the router to resolve a path to its label/section. */
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
