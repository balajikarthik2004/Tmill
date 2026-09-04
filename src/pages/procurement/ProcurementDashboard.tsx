import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, Users, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProcurementDashboard() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Procurement</h2>
      </div>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">12</div>
              <p className="text-xs text-muted-foreground mt-1">Bales en route today</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
              <Users className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">24</div>
              <p className="text-xs text-muted-foreground mt-1">Across 3 countries</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Clock className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-success-600">94.2%</div>
              <p className="text-xs text-muted-foreground mt-1">Trailing 30 days</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Rejections</CardTitle>
              <ShieldCheck className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">1.8%</div>
              <p className="text-xs text-muted-foreground mt-1">-0.4% vs last month</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={item}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-1 mt-4"
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Cotton Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Lot ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quantity (Bales)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { id: 'LOT-902', supplier: 'MCI Cottons', type: 'Indian Extra-Long Staple', qty: 200, status: 'Received' },
                    { id: 'LOT-903', supplier: 'Delta Farming', type: 'US Pima', qty: 150, status: 'In Transit' },
                    { id: 'LOT-904', supplier: 'Nile Exports', type: 'Egyptian Cotton', qty: 100, status: 'Quality Check' },
                  ].map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm font-medium">{row.id}</td>
                      <td className="px-4 py-3 text-sm">{row.supplier}</td>
                      <td className="px-4 py-3 text-sm">{row.type}</td>
                      <td className="px-4 py-3 text-sm">{row.qty}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          row.status === 'Received' ? 'bg-success-50 text-success-600' :
                          row.status === 'In Transit' ? 'bg-brand-50 text-brand-600' :
                          'bg-amber-50 text-amber-600'
                        )}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
