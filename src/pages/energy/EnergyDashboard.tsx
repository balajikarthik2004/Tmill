import { motion } from 'framer-motion'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Wind, TrendingDown, LeafyGreen } from 'lucide-react'

export function EnergyDashboard() {
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
    <div className="space-y-4 p-4 lg:p-6">
      <PageHeader title="Energy Management" description="Live load, renewable share and carbon performance across the group." />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Power Draw</CardTitle>
              <Zap className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold">4.2 MW</div>
              <p className="text-xs text-muted-foreground mt-1">Normal operating range</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Renewable Share</CardTitle>
              <Wind className="h-4 w-4 text-success-600" />
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold text-success-600">68%</div>
              <p className="text-xs text-muted-foreground mt-1">Wind & Solar captive</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Energy Intensity</CardTitle>
              <TrendingDown className="h-4 w-4 text-brand-600" />
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold">2.8 kWh/kg</div>
              <p className="text-xs text-success-600 mt-1">-5% vs target (3.0)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carbon Offset</CardTitle>
              <LeafyGreen className="h-4 w-4 text-success-600" />
            </CardHeader>
            <CardContent>
              <div className="num text-2xl font-semibold">1,240 tCO2e</div>
              <p className="text-xs text-muted-foreground mt-1">YTD avoided emissions</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={item}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-4"
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Power Consumption by Facility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { name: 'Spinning Mill I', share: 40, kwh: '48,500' },
                { name: 'Spinning Mill II', share: 35, kwh: '42,400' },
                { name: 'Spinning Mill III', share: 25, kwh: '30,200' }
              ].map((mill, i) => (
                <div key={mill.name} className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center w-full">
                    <p className="text-sm font-medium leading-none">{mill.name}</p>
                    <p className="text-sm text-muted-foreground">{mill.kwh} kWh / day</p>
                  </div>
                  <div className="h-2 w-full bg-brand-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${mill.share}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full bg-brand-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Source Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center items-center h-[250px] space-y-4">
             <div className="w-full space-y-4">
                <div className="flex justify-between items-center px-4 py-2 bg-success-50 rounded-md border border-success-100">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-success-600" />
                    <span className="text-sm font-medium text-success-700">Captive Wind</span>
                  </div>
                  <span className="font-bold tabular-nums text-success-700">52%</span>
                </div>
                
                <div className="flex justify-between items-center px-4 py-2 bg-copper-50 rounded-lg border border-copper-100">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-copper-600" />
                    <span className="text-sm font-medium text-copper-700">Solar Plant</span>
                  </div>
                  <span className="num font-semibold text-copper-700">16%</span>
                </div>
                
                <div className="flex justify-between items-center px-4 py-2 bg-secondary rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">TANGEDCO Grid</span>
                  </div>
                  <span className="num font-semibold text-foreground">32%</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
