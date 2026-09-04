import { createBrowserRouter, Navigate } from 'react-router-dom'

import { Shell } from '@/components/layout/Shell'
import ExecutiveDashboard from '@/pages/dashboard/ExecutiveDashboard'
import Administration from '@/pages/admin/Administration'

import Customers from '@/pages/sales/Customers'
import SalesOrders from '@/pages/sales/SalesOrders'
import ExportOrders from '@/pages/sales/ExportOrders'
import Dispatch from '@/pages/sales/Dispatch'

import PlanningProductionOrders from '@/pages/planning/ProductionOrders'
import CapacityPlanning from '@/pages/planning/CapacityPlanning'

import { ProcurementDashboard } from '@/pages/procurement/ProcurementDashboard'
import ProcurementSuppliers from '@/pages/procurement/Suppliers'
import PurchaseRequisitions from '@/pages/procurement/PurchaseRequisitions'
import PurchaseOrders from '@/pages/procurement/PurchaseOrders'
import Grn from '@/pages/procurement/Grn'

import CottonLots from '@/pages/cotton/CottonLots'
import CottonTesting from '@/pages/cotton/CottonTesting'
import Traceability from '@/pages/cotton/Traceability'

import { InventoryDashboard } from '@/pages/inventory/InventoryDashboard'
import RawMaterials from '@/pages/inventory/RawMaterials'
import Wip from '@/pages/inventory/Wip'
import FinishedGoods from '@/pages/inventory/FinishedGoods'
import StockMovements from '@/pages/inventory/StockMovements'

import { EnergyDashboard } from '@/pages/energy/EnergyDashboard'

import ProductionOverview from '@/pages/production/ProductionOverview'
import BlowRoom from '@/pages/production/BlowRoom'
import Carding from '@/pages/production/Carding'
import Combing from '@/pages/production/Combing'
import Drawing from '@/pages/production/Drawing'
import Roving from '@/pages/production/Roving'
import RingSpinning from '@/pages/production/RingSpinning'
import OpenEnd from '@/pages/production/OpenEnd'
import Winding from '@/pages/production/Winding'
import Tfo from '@/pages/production/Tfo'
import Gassing from '@/pages/production/Gassing'

import QualityDashboard from '@/pages/quality/QualityDashboard'
import LabTests from '@/pages/quality/LabTests'
import CottonQuality from '@/pages/quality/CottonQuality'
import YarnQuality from '@/pages/quality/YarnQuality'
import Rejections from '@/pages/quality/Rejections'
import Complaints from '@/pages/quality/Complaints'

import MachineDashboard from '@/pages/maintenance/MachineDashboard'
import PreventiveMaintenance from '@/pages/maintenance/PreventiveMaintenance'
import Breakdowns from '@/pages/maintenance/Breakdowns'
import SpareParts from '@/pages/maintenance/SpareParts'

import MasterProducts from '@/pages/master/Products'
import MasterCustomers from '@/pages/master/Customers'
import MasterSuppliers from '@/pages/master/Suppliers'
import MasterMachines from '@/pages/master/Machines'
import MasterCottonLots from '@/pages/master/CottonLots'

/** Every leaf in the navigation tree resolves to a real, data-backed page. */
export const routes = [
  { path: 'sales/customers', element: <Customers /> },
  { path: 'sales/sales-orders', element: <SalesOrders /> },
  { path: 'sales/export-orders', element: <ExportOrders /> },
  { path: 'sales/dispatch', element: <Dispatch /> },

  { path: 'planning/production-orders', element: <PlanningProductionOrders /> },
  { path: 'planning/capacity-planning', element: <CapacityPlanning /> },

  { path: 'procurement', element: <ProcurementDashboard /> },
  { path: 'procurement/suppliers', element: <ProcurementSuppliers /> },
  { path: 'procurement/pr', element: <PurchaseRequisitions /> },
  { path: 'procurement/po', element: <PurchaseOrders /> },
  { path: 'procurement/grn', element: <Grn /> },

  { path: 'cotton/cotton-lots', element: <CottonLots /> },
  { path: 'cotton/cotton-testing', element: <CottonTesting /> },
  { path: 'cotton/traceability', element: <Traceability /> },

  { path: 'inventory', element: <InventoryDashboard /> },
  { path: 'inventory/raw-materials', element: <RawMaterials /> },
  { path: 'inventory/wip', element: <Wip /> },
  { path: 'inventory/finished-goods', element: <FinishedGoods /> },
  { path: 'inventory/stock-movements', element: <StockMovements /> },
  
  { path: 'energy', element: <EnergyDashboard /> },

  { path: 'production', element: <ProductionOverview /> },
  { path: 'production/blow-room', element: <BlowRoom /> },
  { path: 'production/carding', element: <Carding /> },
  { path: 'production/combing', element: <Combing /> },
  { path: 'production/drawing', element: <Drawing /> },
  { path: 'production/roving', element: <Roving /> },
  { path: 'production/ring-spinning', element: <RingSpinning /> },
  { path: 'production/open-end', element: <OpenEnd /> },
  { path: 'production/winding', element: <Winding /> },
  { path: 'production/tfo', element: <Tfo /> },
  { path: 'production/gassing', element: <Gassing /> },

  { path: 'quality/dashboard', element: <QualityDashboard /> },
  { path: 'quality/lab-tests', element: <LabTests /> },
  { path: 'quality/cotton-quality', element: <CottonQuality /> },
  { path: 'quality/yarn-quality', element: <YarnQuality /> },
  { path: 'quality/rejections', element: <Rejections /> },
  { path: 'quality/complaints', element: <Complaints /> },

  { path: 'maintenance/machine-dashboard', element: <MachineDashboard /> },
  { path: 'maintenance/pm', element: <PreventiveMaintenance /> },
  { path: 'maintenance/breakdown', element: <Breakdowns /> },
  { path: 'maintenance/spare-parts', element: <SpareParts /> },

  { path: 'master/products', element: <MasterProducts /> },
  { path: 'master/customers', element: <MasterCustomers /> },
  { path: 'master/suppliers', element: <MasterSuppliers /> },
  { path: 'master/machines', element: <MasterMachines /> },
  { path: 'master/cotton-lots', element: <MasterCottonLots /> },

  { path: 'admin', element: <Administration /> },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <ExecutiveDashboard /> },
      ...routes,
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
