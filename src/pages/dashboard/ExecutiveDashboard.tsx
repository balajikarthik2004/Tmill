import { useAppStore } from '@/store/appStore'
import { useAsync } from '@/hooks/useAsync'
import {
  getActivities,
  getAlerts,
  getExportSummary,
  getFactoryPerformance,
  getInventorySummary,
  getKpiCards,
  getMaintenanceSummary,
  getOrderStatusTiles,
  getProductTypeBreakdown,
  getProductionTrend,
} from '@/services'
import { KpiCard } from '@/components/kpi/KpiCard'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductionTrend } from '@/components/charts/ProductionTrend'
import { FactoryBars } from '@/components/charts/FactoryBars'
import { ProductDonut } from '@/components/charts/ProductDonut'
import { AlertCenter } from '@/components/alerts/AlertCenter'
import { GreetingHero } from './GreetingHero'
import { OrderStatusTiles } from './OrderStatusTiles'
import { InventoryOverview } from './InventoryOverview'
import { MaintenanceSummary } from './MaintenanceSummary'
import { RecentActivities } from './RecentActivities'
import { ExportOverview } from './ExportOverview'
import { AiInsightStrip } from '@/components/ai/AiInsightStrip'

export default function ExecutiveDashboard() {
  const { factoryId, dateRangePreset } = useAppStore()

  const kpis = useAsync(getKpiCards, [])
  const trend = useAsync(() => getProductionTrend(dateRangePreset, factoryId), [dateRangePreset, factoryId])
  const factoryPerf = useAsync(() => getFactoryPerformance(dateRangePreset), [dateRangePreset])
  const productMix = useAsync(
    () => getProductTypeBreakdown(dateRangePreset, factoryId),
    [dateRangePreset, factoryId],
  )
  const orderTiles = useAsync(getOrderStatusTiles, [])
  const inventory = useAsync(getInventorySummary, [])
  const maintenance = useAsync(getMaintenanceSummary, [])
  const exportSummary = useAsync(getExportSummary, [])
  const alerts = useAsync(getAlerts, [])
  const activities = useAsync(getActivities, [])

  const visibleFactoryPerf =
    factoryId === 'all' ? factoryPerf.data : factoryPerf.data?.filter((f) => f.factoryId === factoryId)

  return (
    <div className="space-y-4 p-4 pb-20 lg:p-6 lg:pb-20">
      <GreetingHero firstName="Mr. Hari" />

      <AiInsightStrip
        scope="dashboard"
        title="What the copilot is watching"
        description="Generated from today's production, order book, asset and quality position."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          : kpis.data?.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      {/* Trend + factory performance + product mix */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          {trend.isLoading || !trend.data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <ProductionTrend points={trend.data.points} unit={trend.data.unit} />
          )}
        </div>
        <div>
          {factoryPerf.isLoading || !visibleFactoryPerf ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <FactoryBars data={visibleFactoryPerf} />
          )}
        </div>
        <div>
          {productMix.isLoading || !productMix.data ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <ProductDonut data={productMix.data} unit="kg" />
          )}
        </div>
      </div>

      {/* Orders + inventory + maintenance + energy */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderTiles.isLoading || !orderTiles.data ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <OrderStatusTiles data={orderTiles.data} />
        )}
        {inventory.isLoading || !inventory.data ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <InventoryOverview data={inventory.data} />
        )}
        {maintenance.isLoading || !maintenance.data ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <MaintenanceSummary data={maintenance.data} />
        )}
        {exportSummary.isLoading || !exportSummary.data ? (
          <Skeleton className="h-52 w-full rounded-lg" />
        ) : (
          <ExportOverview data={exportSummary.data} />
        )}
      </div>

      {/* Alerts + activities */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AlertCenter alerts={alerts.data ?? []} isLoading={alerts.isLoading} />
        <RecentActivities activities={activities.data ?? []} isLoading={activities.isLoading} />
      </div>
    </div>
  )
}
