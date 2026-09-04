import { useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PeriodDropdown } from '@/components/common/PeriodDropdown'
import { formatNumber } from '@/lib/format'
import type { ProductType } from '@/types'
import type { ProductTypeSlice } from '@/services/productionService'

const colors: Record<ProductType, string> = {
  Single: '#2563eb',
  Double: '#0d9488',
  'Open End': '#d97706',
  Compact: '#7c3aed',
  Gassed: '#db2777',
  Fabric: '#16a34a',
}

export function ProductDonut({ data, unit }: { data: ProductTypeSlice[]; unit: string }) {
  const navigate = useNavigate()
  const total = data.reduce((sum, d) => sum + d.qty, 0)

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Production by Product Type</CardTitle>
        <PeriodDropdown />
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No production records in this range.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="qty"
                    nameKey="productType"
                    innerRadius="68%"
                    outerRadius="98%"
                    paddingAngle={2}
                    isAnimationActive={false}
                    onClick={(entry) => {
                      const productType = (entry as unknown as ProductTypeSlice).productType
                      navigate(`/production?productType=${productType}`)
                    }}
                    className="cursor-pointer"
                  >
                    {data.map((slice) => (
                      <Cell key={slice.productType} fill={colors[slice.productType]} stroke="hsl(var(--card))" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => {
                      const n = Number(value)
                      return [`${formatNumber(n)} (${((n / total) * 100).toFixed(1)}%)`, String(name)]
                    }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      fontSize: 12,
                      background: 'hsl(var(--popover))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(total)} {unit}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {data.map((slice) => (
                <button
                  key={slice.productType}
                  type="button"
                  onClick={() => navigate(`/production?productType=${slice.productType}`)}
                  className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[slice.productType] }} />
                    <span className="font-medium text-foreground">{slice.productType}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {((slice.qty / total) * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
