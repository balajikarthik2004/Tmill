import { useMemo, useState } from 'react'
import { Boxes, Layers, Sparkles } from 'lucide-react'

import { useAsync } from '@/hooks/useAsync'
import { getCompany, getProducts } from '@/services'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard, StatGrid } from '@/components/common/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumber } from '@/lib/format'
import type { Product, ProductType, YarnApplication } from '@/types'

const typeOrder: ProductType[] = ['Single', 'Double', 'Open End', 'Compact', 'Gassed']

const typeColors: Record<ProductType, string> = {
  Single: '#0f6e56',
  Double: '#3a7d8c',
  'Open End': '#b4632a',
  Compact: '#7c4a6e',
  Gassed: '#4a6fa5',
}

/** The count range published for each type on tmills.com. */
const publishedRange: Record<ProductType, string> = {
  Single: 'NE 16s–80s',
  Double: 'NE 2/20s–2/140s',
  'Open End': 'NE 6s–10s',
  Compact: 'Up to NE 140s',
  Gassed: 'Specialty counts',
}

/** Which published product range describes each catalogue type. */
const rangeNameByType: Record<ProductType, string> = {
  Single: 'Single Yarn',
  Double: 'Double Yarn',
  'Open End': 'Open End Yarn',
  Compact: 'Compact Yarn',
  Gassed: 'Gassed Yarn',
}

const applicationVariant: Record<YarnApplication, NonNullable<BadgeProps['variant']>> = {
  Knitting: 'info',
  Weaving: 'secondary',
  Hosiery: 'warning',
}

const ALL = 'all'

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="rounded-md border border-border p-3.5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{product.name}</div>
          <div className="mt-0.5 font-mono text-xs text-muted-foreground">{product.code}</div>
        </div>
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: typeColors[product.type] }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {product.count && <Badge variant="outline">NE {product.count}</Badge>}
        <Badge variant={applicationVariant[product.application]}>{product.application}</Badge>
        <Badge variant="outline">Sold per {product.unit}</Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
    </div>
  )
}

export default function Products() {
  const [tab, setTab] = useState<string>(ALL)

  const products = useAsync(getProducts, [])
  const company = useAsync(getCompany, [])

  const rangeDetail = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of company.data?.productRanges ?? []) map.set(r.name, r.detail)
    return map
  }, [company.data])

  const groups = useMemo(() => {
    const map = new Map<ProductType, Product[]>()
    for (const p of products.data ?? []) {
      const list = map.get(p.type) ?? []
      list.push(p)
      map.set(p.type, list)
    }
    return typeOrder
      .filter((t) => map.has(t))
      .map((t) => ({ type: t, items: map.get(t) ?? [] }))
  }, [products.data])

  const visibleGroups = tab === ALL ? groups : groups.filter((g) => g.type === tab)

  const yarnCount = (products.data ?? []).filter((p) => p.category === 'Yarn').length

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader
        title="Products"
        description="The yarn catalogue, grouped by the product ranges published by Thiagarajar Mills."
        actions={
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value={ALL}>All</TabsTrigger>
              {typeOrder.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-17.5 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <StatGrid cols={4}>
          <StatCard
            label="Catalogue items"
            value={formatNumber(products.data?.length ?? 0)}
            sublabel={`${groups.length} product types`}
            icon={Boxes}
          />
          <StatCard label="Yarn products" value={formatNumber(yarnCount)} sublabel="Single, double, OE, compact, gassed" icon={Layers} tone="info" />
          <StatCard
            label="Compact spinning"
            value="Rieter ComforSpin K44"
            sublabel="Among the first installed in India"
            icon={Sparkles}
            tone="warning"
          />
        </StatGrid>
      )}

      {products.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-lg" />
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No products in this range.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => (
            <Card key={group.type}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColors[group.type] }} />
                  <CardTitle>{group.type}</CardTitle>
                  <Badge variant="outline">{publishedRange[group.type]}</Badge>
                  <Badge variant="secondary">{formatNumber(group.items.length)} items</Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {rangeDetail.get(rangeNameByType[group.type]) ?? publishedRange[group.type]}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
