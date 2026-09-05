/**
 * The snapshot of plant state the copilot reasons over.
 *
 * `src/lib/ai/` is deliberately pure: it never imports from `src/mock/`. The
 * service layer assembles this context and hands it in, which is exactly the
 * seam a real retrieval backend would slot into later.
 */
import type {
  Alert,
  AiEngineer,
  AiIncident,
  BreakdownRecord,
  CottonLot,
  Customer,
  CustomerComplaint,
  EnergyDayRecord,
  Factory,
  InventorySummary,
  Machine,
  PmTask,
  Product,
  ProductionOrder,
  ProductionRecord,
  QualityTest,
  Rejection,
  SalesOrder,
  SparePart,
  Supplier,
} from '@/types'

export interface AiDataContext {
  factories: Factory[]
  machines: Machine[]
  breakdowns: BreakdownRecord[]
  pmTasks: PmTask[]
  spareParts: SparePart[]
  salesOrders: SalesOrder[]
  productionOrders: ProductionOrder[]
  productionRecords: ProductionRecord[]
  qualityTests: QualityTest[]
  rejections: Rejection[]
  complaints: CustomerComplaint[]
  cottonLots: CottonLot[]
  energyRecords: EnergyDayRecord[]
  inventory: InventorySummary[]
  alerts: Alert[]
  customers: Customer[]
  products: Product[]
  suppliers: Supplier[]
  engineers: AiEngineer[]
  incidents: AiIncident[]
  qualityPassRatePct: number
}

export function factoryLabel(ctx: AiDataContext, factoryId: string): string {
  return ctx.factories.find((f) => f.id === factoryId)?.name ?? 'Plant'
}

export function factoryShort(ctx: AiDataContext, factoryId: string): string {
  return ctx.factories.find((f) => f.id === factoryId)?.shortName ?? factoryId
}
