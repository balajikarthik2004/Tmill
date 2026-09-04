import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertCircle, RefreshCw, Box } from 'lucide-react'
import { cn } from '@/lib/utils'

export function InventoryDashboard() {
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
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Inventory Overview</h2>
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
              <CardTitle className="text-sm font-medium">Raw Cotton (Bales)</CardTitle>
              <Package className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">4,200</div>
              <p className="text-xs text-muted-foreground mt-1">12 days coverage</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Yarn Stock (kg)</CardTitle>
              <Box className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">145,000</div>
              <p className="text-xs text-muted-foreground mt-1">+5% from last week</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Reorder Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-amber-600">3</div>
              <p className="text-xs text-amber-600/80 mt-1">Critical spares & dyes</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Turnover</CardTitle>
              <RefreshCw className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">18.2x</div>
              <p className="text-xs text-muted-foreground mt-1">Annualized rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={item}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 mt-4"
      >
        <Card className="col-span-4 glass-card">
          <CardHeader>
            <CardTitle>Inventory Valuation</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Valuation trend chart will appear here</p>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 glass-card">
          <CardHeader>
            <CardTitle>Stock by Facility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Spinning Mill I', 'Spinning Mill II', 'Spinning Mill III', 'OE & Post-Spinning'].map((mill, i) => (
                <div key={mill} className="flex items-center">
                  <div className="ml-4 space-y-1 w-full">
                    <div className="flex justify-between items-center w-full">
                      <p className="text-sm font-medium leading-none">{mill}</p>
                      <p className="text-sm text-muted-foreground">{100 - i * 15}% Capacity</p>
                    </div>
                    <div className="h-2 w-full bg-brand-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${100 - i * 15}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={cn("h-full bg-brand-500")} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
