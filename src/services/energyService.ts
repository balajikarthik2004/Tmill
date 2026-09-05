/**
 * Energy analysis engine.
 *
 * Four questions, in the order an energy manager has to ask them:
 *
 *   1. WHAT   What are we buying and burning — power, water, air, diesel — and
 *             where inside the mill does it go?
 *   2. WASTE  Which of it never reaches yarn: leaks, idling, poor power factor,
 *             ageing motors, distribution losses?
 *   3. WHO    Which unit's consumption moved against the previous period, once
 *             output is taken into account?
 *   4. WHY    Was that because we made more yarn, or because we got less
 *             efficient — and if the latter, which driver did it?
 *
 * The pivot throughout is specific energy consumption (kWh/kg). Raw kWh cannot
 * answer any of these on its own: a mill that spins more yarn uses more power
 * and is not thereby worse.
 */
import type {
  DateRangePreset,
  EnergyDayRecord,
  EnergyEndUse,
  EnergySource,
  FactoryId,
  WaterSource,
  WaterUse,
} from '@/types'
import {
  COUNT_EXPONENT,
  HUMIDIFICATION_SENSITIVITY,
  HUMIDIFICATION_TARGET_RH,
  co2KgPerKwh,
  endUseBenchmarkByProfile,
  energyProfileFor,
  energyEndUseList,
  energyRecords,
  energySourceList,
  factories,
  lossCoefficients,
  employeesByUnit,
  machines,
  tariffInrPerKwh,
  unitEnergyModel,
  waterLossCoefficients,
  waterSourceList,
  waterTariffInrPerKl,
  waterUseList,
} from '@/mock'
import { resolveDateRange } from '@/lib/dateRange'
import { simulateDelay } from './delay'

const DAY_MS = 86_400_000

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)

const factoryName = new Map(factories.map((f) => [f.id as string, f.name]))
const factoryShortName = new Map(factories.map((f) => [f.id as string, f.shortName]))

// ---------------------------------------------------------------------------
// Period selection
// ---------------------------------------------------------------------------

/** How many days a preset covers — used to line up the comparison window. */
function daysInPreset(preset: DateRangePreset): number {
  const { from, to } = resolveDateRange(preset)
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS))
}

interface Window {
  from: number
  to: number
  days: number
}

/** The selected period, and the equally long window immediately before it. */
function windows(preset: DateRangePreset): { current: Window; previous: Window } {
  const { from, to } = resolveDateRange(preset)
  const fromMs = new Date(from).getTime()
  const toMs = new Date(to).getTime()
  const days = daysInPreset(preset)
  const span = toMs - fromMs
  return {
    current: { from: fromMs, to: toMs, days },
    previous: { from: fromMs - span, to: fromMs, days },
  }
}

function recordsIn(window: Window, factoryId: FactoryId): EnergyDayRecord[] {
  return energyRecords.filter((r) => {
    const t = new Date(r.date).getTime()
    return t >= window.from && t <= window.to && (factoryId === 'all' || r.factoryId === factoryId)
  })
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

interface Totals {
  kwh: number
  outputKg: number
  sec: number
  costInr: number
  co2Kg: number
  waterKl: number
  compressedAirNm3: number
  dieselL: number
  powerFactor: number
  ambientRhPct: number
  avgCount: number
  renewableKwh: number
  renewableSharePct: number
  bySource: Record<EnergySource, number>
  byEndUse: Record<EnergyEndUse, number>
  days: number
}

function aggregate(records: EnergyDayRecord[]): Totals {
  const bySource = energySourceList.reduce(
    (acc, s) => {
      acc[s] = sum(records.map((r) => r.kwhBySource[s] ?? 0))
      return acc
    },
    {} as Record<EnergySource, number>,
  )
  const byEndUse = energyEndUseList.reduce(
    (acc, u) => {
      acc[u] = sum(records.map((r) => r.kwhByEndUse[u] ?? 0))
      return acc
    },
    {} as Record<EnergyEndUse, number>,
  )

  const kwh = sum(records.map((r) => r.totalKwh))
  const outputKg = sum(records.map((r) => r.outputKg))
  const renewableKwh = bySource['Captive Wind'] + bySource.Solar

  // Averages that describe operating conditions are weighted by output, so a
  // near-idle Sunday does not carry the same weight as a full weekday.
  const weight = outputKg > 0 ? outputKg : records.length
  const weighted = (pick: (r: EnergyDayRecord) => number) =>
    outputKg > 0
      ? sum(records.map((r) => pick(r) * r.outputKg)) / weight
      : records.length
        ? sum(records.map(pick)) / records.length
        : 0

  const days = new Set(records.map((r) => r.date.slice(0, 10))).size

  return {
    kwh,
    outputKg,
    sec: outputKg > 0 ? kwh / outputKg : 0,
    costInr: sum(energySourceList.map((s) => bySource[s] * tariffInrPerKwh[s])),
    co2Kg: sum(energySourceList.map((s) => bySource[s] * co2KgPerKwh[s])),
    waterKl: sum(records.map((r) => r.waterKl)),
    compressedAirNm3: sum(records.map((r) => r.compressedAirNm3)),
    dieselL: sum(records.map((r) => r.dieselL)),
    powerFactor: weighted((r) => r.powerFactor),
    ambientRhPct: weighted((r) => r.ambientRhPct),
    avgCount: weighted((r) => r.avgCount),
    renewableKwh,
    renewableSharePct: kwh > 0 ? (renewableKwh / kwh) * 100 : 0,
    bySource,
    byEndUse,
    days,
  }
}

/**
 * Benchmark share for an end use, weighted by each unit's share of the scope.
 *
 * A flat benchmark cannot be compared against a mixed scope: ring spinning is
 * 42% of a spinning mill but nothing at all in the OE unit, so on an "All
 * units" view the fair benchmark is the output-weighted blend of the two.
 */
function benchmarkShareFor(records: EnergyDayRecord[]) {
  const kwhByUnit = new Map<string, number>()
  for (const r of records) {
    kwhByUnit.set(r.factoryId, (kwhByUnit.get(r.factoryId) ?? 0) + r.totalKwh)
  }
  const totalKwh = sum([...kwhByUnit.values()])
  return (endUse: EnergyEndUse) => {
    if (totalKwh <= 0) return 0
    let weighted = 0
    for (const [unitId, kwh] of kwhByUnit) {
      weighted += (endUseBenchmarkByProfile[energyProfileFor(unitId)][endUse] ?? 0) * kwh
    }
    return weighted / totalKwh
  }
}

const pctChange = (now: number, prev: number) => (prev > 0 ? ((now - prev) / prev) * 100 : 0)

// ---------------------------------------------------------------------------
// 1. What are we using?
// ---------------------------------------------------------------------------

export interface EnergyOverview {
  periodDays: number
  totalKwh: number
  outputKg: number
  /** Specific energy consumption — kWh per kilogram of yarn. */
  secKwhPerKg: number
  secPrev: number
  secChangePct: number
  kwhChangePct: number
  outputChangePct: number
  costInr: number
  costChangePct: number
  blendedRateInrPerKwh: number
  co2Tonnes: number
  co2ChangePct: number
  renewableSharePct: number
  renewableSharePrevPct: number
  /** Average electrical load across the period. */
  avgLoadMw: number
  peakLoadMw: number
  powerFactor: number
  /** Cost of a kilogram of yarn in energy alone. */
  energyCostPerKgInr: number
}

export interface SourceRow {
  source: EnergySource
  kwh: number
  sharePct: number
  costInr: number
  tariffInrPerKwh: number
  co2Kg: number
  isRenewable: boolean
  changePct: number
}

export interface ResourceRow {
  resource: string
  value: number
  unit: string
  perKg: number
  perKgUnit: string
  changePct: number
  note: string
}

export interface EndUseRow {
  endUse: EnergyEndUse
  kwh: number
  sharePct: number
  benchmarkSharePct: number
  /** Percentage points above the benchmark share. Negative is good. */
  gapPts: number
  perKg: number
  costInr: number
}

export interface EnergyUsage {
  overview: EnergyOverview
  bySource: SourceRow[]
  byEndUse: EndUseRow[]
  resources: ResourceRow[]
}

/** Question 1 — what the mill is buying, burning and where it goes. */
export async function getEnergyUsage(
  preset: DateRangePreset = '30d',
  factoryId: FactoryId = 'all',
): Promise<EnergyUsage> {
  const { current, previous } = windows(preset)
  const now = aggregate(recordsIn(current, factoryId))
  const prev = aggregate(recordsIn(previous, factoryId))

  const dayTotals = new Map<string, number>()
  for (const r of recordsIn(current, factoryId)) {
    const day = r.date.slice(0, 10)
    dayTotals.set(day, (dayTotals.get(day) ?? 0) + r.totalKwh)
  }
  const dailyKwh = [...dayTotals.values()]

  const overview: EnergyOverview = {
    periodDays: now.days,
    totalKwh: Math.round(now.kwh),
    outputKg: Math.round(now.outputKg),
    secKwhPerKg: round(now.sec, 2),
    secPrev: round(prev.sec, 2),
    secChangePct: round(pctChange(now.sec, prev.sec)),
    kwhChangePct: round(pctChange(now.kwh, prev.kwh)),
    outputChangePct: round(pctChange(now.outputKg, prev.outputKg)),
    costInr: Math.round(now.costInr),
    costChangePct: round(pctChange(now.costInr, prev.costInr)),
    blendedRateInrPerKwh: round(now.kwh > 0 ? now.costInr / now.kwh : 0, 2),
    co2Tonnes: round(now.co2Kg / 1000),
    co2ChangePct: round(pctChange(now.co2Kg, prev.co2Kg)),
    renewableSharePct: round(now.renewableSharePct),
    renewableSharePrevPct: round(prev.renewableSharePct),
    avgLoadMw: round(now.days > 0 ? now.kwh / (now.days * 24) / 1000 : 0, 2),
    peakLoadMw: round(dailyKwh.length ? Math.max(...dailyKwh) / 24 / 1000 : 0, 2),
    powerFactor: round(now.powerFactor, 3),
    energyCostPerKgInr: round(now.outputKg > 0 ? now.costInr / now.outputKg : 0, 2),
  }

  const bySource: SourceRow[] = energySourceList
    .map((source) => ({
      source,
      kwh: Math.round(now.bySource[source]),
      sharePct: round(now.kwh > 0 ? (now.bySource[source] / now.kwh) * 100 : 0),
      costInr: Math.round(now.bySource[source] * tariffInrPerKwh[source]),
      tariffInrPerKwh: tariffInrPerKwh[source],
      co2Kg: Math.round(now.bySource[source] * co2KgPerKwh[source]),
      isRenewable: source === 'Captive Wind' || source === 'Solar',
      changePct: round(pctChange(now.bySource[source], prev.bySource[source])),
    }))
    .filter((row) => row.kwh > 0)
    .sort((a, b) => b.kwh - a.kwh)

  const benchmarkFor = benchmarkShareFor(recordsIn(current, factoryId))
  const byEndUse: EndUseRow[] = energyEndUseList
    .map((endUse) => {
      const kwh = now.byEndUse[endUse]
      const sharePct = now.kwh > 0 ? (kwh / now.kwh) * 100 : 0
      const benchmark = benchmarkFor(endUse) * 100
      return {
        endUse,
        kwh: Math.round(kwh),
        sharePct: round(sharePct),
        benchmarkSharePct: round(benchmark),
        gapPts: round(sharePct - benchmark),
        perKg: round(now.outputKg > 0 ? kwh / now.outputKg : 0, 2),
        costInr: Math.round(kwh * overview.blendedRateInrPerKwh),
      }
    })
    .filter((row) => row.kwh > 0)
    .sort((a, b) => b.kwh - a.kwh)

  const resources: ResourceRow[] = [
    {
      resource: 'Electricity',
      value: Math.round(now.kwh),
      unit: 'kWh',
      perKg: round(now.sec, 2),
      perKgUnit: 'kWh/kg',
      changePct: round(pctChange(now.kwh, prev.kwh)),
      note: 'Spindle drives, humidification, compressed air and utilities',
    },
    {
      resource: 'Water',
      value: round(now.waterKl),
      unit: 'kL',
      perKg: round(now.outputKg > 0 ? (now.waterKl * 1000) / now.outputKg : 0, 2),
      perKgUnit: 'L/kg',
      changePct: round(pctChange(now.waterKl, prev.waterKl)),
      note: 'Humidification make-up and process water',
    },
    {
      resource: 'Compressed air',
      value: Math.round(now.compressedAirNm3),
      unit: 'Nm³',
      perKg: round(now.outputKg > 0 ? now.compressedAirNm3 / now.outputKg : 0, 2),
      perKgUnit: 'Nm³/kg',
      changePct: round(pctChange(now.compressedAirNm3, prev.compressedAirNm3)),
      note: 'Autoconer splicing, cleaning and pneumatic actuation',
    },
    {
      resource: 'Diesel',
      value: Math.round(now.dieselL),
      unit: 'L',
      perKg: round(now.outputKg > 0 ? (now.dieselL * 1000) / now.outputKg : 0, 2),
      perKgUnit: 'mL/kg',
      changePct: round(pctChange(now.dieselL, prev.dieselL)),
      note: 'Standby gensets during grid outages',
    },
  ]

  return simulateDelay({ overview, bySource, byEndUse, resources })
}

// ---------------------------------------------------------------------------
// 2. Where is it being lost?
// ---------------------------------------------------------------------------

export interface EnergyLoss {
  category: string
  kwh: number
  sharePct: number
  costInr: number
  /** What the plant's own data says is causing it. */
  cause: string
  /** What to do about it. */
  action: string
  /** Share of this loss that is realistically recoverable. */
  recoverablePct: number
  recoverableInr: number
  severity: 'high' | 'medium' | 'low'
}

export interface EnergyLossReport {
  totalLossKwh: number
  totalLossSharePct: number
  totalLossInr: number
  recoverableInr: number
  recoverableKwh: number
  /** What SEC would be if every recoverable loss were eliminated. */
  secToday: number
  secIfRecovered: number
  losses: EnergyLoss[]
}

/** Question 2 — the power that never reaches yarn. */
export async function getEnergyLosses(
  preset: DateRangePreset = '30d',
  factoryId: FactoryId = 'all',
): Promise<EnergyLossReport> {
  const { current } = windows(preset)
  const records = recordsIn(current, factoryId)
  const now = aggregate(records)
  const rate = now.kwh > 0 ? now.costInr / now.kwh : 0

  const fleet = factoryId === 'all' ? machines : machines.filter((m) => m.factoryId === factoryId)
  const running = fleet.filter((m) => m.status === 'Running').length
  const idle = fleet.filter((m) => m.status === 'Idle').length
  const breakdown = fleet.filter((m) => m.status === 'Breakdown').length
  const ageing = fleet.filter((m) => m.installedYear < lossCoefficients.ie3CutoffYear).length

  const hours = Math.max(1, now.days * 24)
  // Average draw of one running machine, inferred from the meter rather than assumed.
  const kwhPerMachineHour = running > 0 ? now.kwh / (running * hours) : 0

  const idleKwh = idle * kwhPerMachineHour * lossCoefficients.idleLoadShare * hours
  const airKwh = now.byEndUse['Compressed Air'] * lossCoefficients.compressedAirLeakRate
  const distributionKwh = now.kwh * lossCoefficients.distributionLossRate
  const pfKwh =
    now.powerFactor > 0 && now.powerFactor < lossCoefficients.targetPowerFactor
      ? now.kwh * (lossCoefficients.targetPowerFactor / now.powerFactor - 1)
      : 0
  const motorKwh =
    fleet.length > 0
      ? now.kwh * (ageing / fleet.length) * lossCoefficients.ageingMotorPenalty
      : 0

  // Humidification running above the benchmark share for this plant.
  const humidBenchmarkShare = benchmarkShareFor(records)('Humidification')
  const humidBenchmark = humidBenchmarkShare * now.kwh
  const humidKwh = Math.max(0, now.byEndUse.Humidification - humidBenchmark)

  const breakdownKwh = breakdown * lossCoefficients.breakdownRestartKwhPerHour * now.days

  const raw = [
    {
      category: 'Idle machines left powered',
      kwh: idleKwh,
      cause: `${idle} of ${fleet.length} machines are idle but still drawing a no-load load — drives, suction and lighting stay on between jobs.`,
      action: 'Enforce shut-down on any frame idle beyond one shift; interlock suction fans to the frame drive.',
      recoverablePct: 70,
      severity: 'high' as const,
    },
    {
      category: 'Compressed air leaks',
      kwh: airKwh,
      cause: `Roughly ${Math.round(lossCoefficients.compressedAirLeakRate * 100)}% of generated air escapes before it does work — the industry norm for an unsurveyed distribution ring.`,
      action: 'Ultrasonic leak survey each quarter; drop line pressure to the lowest setting the autoconers accept.',
      recoverablePct: 60,
      severity: 'high' as const,
    },
    {
      category: 'Humidification over-run',
      kwh: humidKwh,
      cause: `Humidification is taking ${round((now.byEndUse.Humidification / now.kwh) * 100)}% of the load against a ${round(humidBenchmarkShare * 100)}% benchmark for this mix of units, with ambient at ${round(now.ambientRhPct)}% RH.`,
      action: 'Close the loop on RH sensors per hall and run the plant on variable-speed drives instead of damper control.',
      recoverablePct: 45,
      severity: 'medium' as const,
    },
    {
      category: 'Ageing motors below IE3',
      kwh: motorKwh,
      cause: `${ageing} machines were installed before ${lossCoefficients.ie3CutoffYear} and run motors roughly ${Math.round(lossCoefficients.ageingMotorPenalty * 100)}% less efficient than a modern equivalent.`,
      action: 'Replace motors at rewind rather than rewinding them; prioritise the frames with the highest running hours.',
      recoverablePct: 35,
      severity: 'medium' as const,
    },
    {
      category: 'Distribution & transformer losses',
      kwh: distributionKwh,
      cause: `About ${round(lossCoefficients.distributionLossRate * 100)}% is lost as heat between the incomer and the machines — largely unavoidable, but it rises with poor loading.`,
      action: 'Balance transformer loading across the units and retire lightly loaded transformers during low-output weeks.',
      recoverablePct: 15,
      severity: 'low' as const,
    },
    {
      category: 'Power factor penalty',
      kwh: pfKwh,
      cause: `Power factor is averaging ${round(now.powerFactor, 3)} against a ${lossCoefficients.targetPowerFactor} target, so the utility bills for reactive power the mill never uses.`,
      action: 'Bring the APFC panel back into automatic control and replace failed capacitor banks.',
      recoverablePct: 85,
      severity: pfKwh > now.kwh * 0.01 ? ('high' as const) : ('low' as const),
    },
    {
      category: 'Breakdown restarts & re-piecing',
      kwh: breakdownKwh,
      cause: `${breakdown} machines are down; restarting and re-piecing after each stoppage burns power that produces nothing.`,
      action: 'Attack the top breakdown causes on the maintenance dashboard — every hour of uptime avoids this twice over.',
      recoverablePct: 50,
      severity: 'low' as const,
    },
  ]

  const losses: EnergyLoss[] = raw
    .filter((l) => l.kwh > 0)
    .map((l) => ({
      category: l.category,
      kwh: Math.round(l.kwh),
      sharePct: round(now.kwh > 0 ? (l.kwh / now.kwh) * 100 : 0),
      costInr: Math.round(l.kwh * rate),
      cause: l.cause,
      action: l.action,
      recoverablePct: l.recoverablePct,
      recoverableInr: Math.round(((l.kwh * rate) * l.recoverablePct) / 100),
      severity: l.severity,
    }))
    .sort((a, b) => b.kwh - a.kwh)

  const totalLossKwh = sum(losses.map((l) => l.kwh))
  const recoverableKwh = sum(raw.map((l) => (l.kwh * l.recoverablePct) / 100))

  return simulateDelay({
    totalLossKwh: Math.round(totalLossKwh),
    totalLossSharePct: round(now.kwh > 0 ? (totalLossKwh / now.kwh) * 100 : 0),
    totalLossInr: Math.round(totalLossKwh * rate),
    recoverableInr: Math.round(recoverableKwh * rate),
    recoverableKwh: Math.round(recoverableKwh),
    secToday: round(now.sec, 2),
    secIfRecovered: round(now.outputKg > 0 ? (now.kwh - recoverableKwh) / now.outputKg : 0, 2),
    losses,
  })
}

// ---------------------------------------------------------------------------
// 3 & 4. Which unit moved, and why
// ---------------------------------------------------------------------------

export interface VarianceDriver {
  label: string
  kwh: number
  detail: string
}

export interface UnitEnergyVariance {
  factoryId: string
  name: string
  shortName: string
  kwh: number
  kwhPrev: number
  kwhChangePct: number
  outputKg: number
  outputPrevKg: number
  outputChangePct: number
  sec: number
  secPrev: number
  secChangePct: number
  costInr: number
  sharePct: number
  /** kWh explained by making more or less yarn at the old efficiency. */
  volumeEffectKwh: number
  /** kWh explained by the efficiency itself moving. This is the real story. */
  efficiencyEffectKwh: number
  drivers: VarianceDriver[]
  /** One sentence a manager can act on. */
  verdict: string
  status: 'worse' | 'better' | 'steady'
}

export interface EnergyComparison {
  units: UnitEnergyVariance[]
  /** The unit whose efficiency deteriorated most in absolute kWh. */
  worstOffender: UnitEnergyVariance | null
  groupVolumeEffectKwh: number
  groupEfficiencyEffectKwh: number
  groupChangeKwh: number
  headline: string
}

/**
 * Splits each unit's change in consumption into the part caused by making a
 * different quantity of yarn and the part caused by efficiency moving:
 *
 *   volume effect     = (kg_now − kg_prev) × SEC_prev
 *   efficiency effect = (SEC_now − SEC_prev) × kg_now
 *
 * The two add back exactly to the total change, so nothing is hand-waved.
 * The efficiency effect is then attributed to the drivers the meters can
 * actually evidence — count mix, how much of the fixed load each kilogram had
 * to carry, and ambient humidity — with the remainder reported honestly as
 * unexplained rather than forced into a bucket.
 */
export async function getEnergyComparison(
  preset: DateRangePreset = '30d',
): Promise<EnergyComparison> {
  const { current, previous } = windows(preset)

  const units: UnitEnergyVariance[] = factories
    .filter((f) => unitEnergyModel[f.id])
    .map((factory) => {
      const now = aggregate(recordsIn(current, factory.id))
      const prev = aggregate(recordsIn(previous, factory.id))
      const model = unitEnergyModel[factory.id]

      const volumeEffectKwh = (now.outputKg - prev.outputKg) * prev.sec
      const efficiencyEffectKwh = (now.sec - prev.sec) * now.outputKg

      // --- attribute the efficiency effect to evidenced drivers -------------

      // Finer counts draw more power per kilogram.
      const countFactorNow = (now.avgCount / model.refCount) ** COUNT_EXPONENT
      const countFactorPrev = (prev.avgCount / model.refCount) ** COUNT_EXPONENT
      const countDriverKwh = model.variableSec * (countFactorNow - countFactorPrev) * now.outputKg

      // The fixed load is the same each day, so fewer kilograms carry more of it.
      const dailyKgNow = now.days > 0 ? now.outputKg / now.days : 0
      const dailyKgPrev = prev.days > 0 ? prev.outputKg / prev.days : 0
      const fixedPerKgNow = dailyKgNow > 0 ? model.fixedKwh / dailyKgNow : 0
      const fixedPerKgPrev = dailyKgPrev > 0 ? model.fixedKwh / dailyKgPrev : 0
      const utilisationDriverKwh = (fixedPerKgNow - fixedPerKgPrev) * now.outputKg

      // Dry ambient air makes the humidification plant work harder.
      const humidNow = Math.max(0, HUMIDIFICATION_TARGET_RH - now.ambientRhPct)
      const humidPrev = Math.max(0, HUMIDIFICATION_TARGET_RH - prev.ambientRhPct)
      const humidityDriverKwh =
        model.fixedKwh * HUMIDIFICATION_SENSITIVITY * (humidNow - humidPrev) * now.days

      const explained = countDriverKwh + utilisationDriverKwh + humidityDriverKwh
      const residualKwh = efficiencyEffectKwh - explained

      const drivers: VarianceDriver[] = [
        {
          label: 'Count mix',
          kwh: Math.round(countDriverKwh),
          detail: `Average count moved from NE ${round(prev.avgCount)} to NE ${round(now.avgCount)}. ${
            now.avgCount > prev.avgCount
              ? 'Finer yarn costs more power per kilogram — the same frames deliver fewer kilograms per spindle hour.'
              : 'Coarser yarn spins more kilograms per spindle hour, so power per kilogram falls.'
          }`,
        },
        {
          label: 'Capacity utilisation',
          kwh: Math.round(utilisationDriverKwh),
          detail: `Output averaged ${Math.round(dailyKgNow)} kg a day against ${Math.round(dailyKgPrev)} kg before. Humidification, compressed air and lighting run regardless, so ${
            dailyKgNow < dailyKgPrev ? 'fewer kilograms had to carry that same base load' : 'the base load spread over more kilograms'
          }.`,
        },
        {
          label: 'Ambient humidity',
          kwh: Math.round(humidityDriverKwh),
          detail: `Ambient averaged ${round(now.ambientRhPct)}% RH against ${round(prev.ambientRhPct)}% before, against a ${HUMIDIFICATION_TARGET_RH}% hall target.`,
        },
        {
          label: 'Unexplained',
          kwh: Math.round(residualKwh),
          detail:
            'Not accounted for by count, utilisation or ambient conditions — the residue where leaks, idling and drifting machine settings show up.',
        },
      ]
        .filter((d) => Math.abs(d.kwh) >= 1)
        .sort((a, b) => Math.abs(b.kwh) - Math.abs(a.kwh))

      const secChangePct = pctChange(now.sec, prev.sec)
      const status: 'worse' | 'better' | 'steady' =
        secChangePct > 2 ? 'worse' : secChangePct < -2 ? 'better' : 'steady'

      const top = drivers[0]
      const verdict =
        status === 'steady'
          ? `Holding at ${round(now.sec, 2)} kWh/kg — no material change against the previous period.`
          : `${round(now.sec, 2)} kWh/kg, ${status === 'worse' ? 'up' : 'down'} ${Math.abs(round(secChangePct))}%. Largest single factor: ${top?.label.toLowerCase() ?? 'operating conditions'}.`

      return {
        factoryId: factory.id,
        name: factoryName.get(factory.id) ?? factory.id,
        shortName: factoryShortName.get(factory.id) ?? factory.id,
        kwh: Math.round(now.kwh),
        kwhPrev: Math.round(prev.kwh),
        kwhChangePct: round(pctChange(now.kwh, prev.kwh)),
        outputKg: Math.round(now.outputKg),
        outputPrevKg: Math.round(prev.outputKg),
        outputChangePct: round(pctChange(now.outputKg, prev.outputKg)),
        sec: round(now.sec, 2),
        secPrev: round(prev.sec, 2),
        secChangePct: round(secChangePct),
        costInr: Math.round(now.costInr),
        sharePct: 0,
        volumeEffectKwh: Math.round(volumeEffectKwh),
        efficiencyEffectKwh: Math.round(efficiencyEffectKwh),
        drivers,
        verdict,
        status,
      }
    })

  const groupKwh = sum(units.map((u) => u.kwh))
  for (const unit of units) {
    unit.sharePct = round(groupKwh > 0 ? (unit.kwh / groupKwh) * 100 : 0)
  }

  const ranked = units.slice().sort((a, b) => b.efficiencyEffectKwh - a.efficiencyEffectKwh)
  const worstOffender = ranked[0] && ranked[0].efficiencyEffectKwh > 0 ? ranked[0] : null

  const groupVolumeEffectKwh = sum(units.map((u) => u.volumeEffectKwh))
  const groupEfficiencyEffectKwh = sum(units.map((u) => u.efficiencyEffectKwh))
  const groupChangeKwh = groupVolumeEffectKwh + groupEfficiencyEffectKwh

  const headline = worstOffender
    ? `${worstOffender.name} is the unit to look at: ${Math.abs(worstOffender.secChangePct)}% ${worstOffender.secChangePct > 0 ? 'worse' : 'better'} per kilogram, ${
        worstOffender.drivers[0]
          ? `driven mainly by ${worstOffender.drivers[0].label.toLowerCase()}`
          : 'across several factors'
      }.`
    : 'No unit deteriorated against the previous period — every mill held or improved its energy per kilogram.'

  return simulateDelay({
    units: units.sort((a, b) => b.kwh - a.kwh),
    worstOffender,
    groupVolumeEffectKwh: Math.round(groupVolumeEffectKwh),
    groupEfficiencyEffectKwh: Math.round(groupEfficiencyEffectKwh),
    groupChangeKwh: Math.round(groupChangeKwh),
    headline,
  })
}

// ---------------------------------------------------------------------------
// Trend
// ---------------------------------------------------------------------------

export interface EnergyTrendPoint {
  date: string
  kwh: number
  outputKg: number
  sec: number
  renewableKwh: number
  gridKwh: number
}

/** Daily consumption and intensity, for the trend chart. */
export async function getEnergyTrend(
  preset: DateRangePreset = '30d',
  factoryId: FactoryId = 'all',
): Promise<EnergyTrendPoint[]> {
  const { current } = windows(preset)
  const byDay = new Map<string, { kwh: number; kg: number; renewable: number; grid: number }>()

  for (const r of recordsIn(current, factoryId)) {
    const day = r.date.slice(0, 10)
    const entry = byDay.get(day) ?? { kwh: 0, kg: 0, renewable: 0, grid: 0 }
    entry.kwh += r.totalKwh
    entry.kg += r.outputKg
    entry.renewable += r.kwhBySource['Captive Wind'] + r.kwhBySource.Solar
    entry.grid += r.kwhBySource['Grid (TANGEDCO)'] + r.kwhBySource['Diesel Genset']
    byDay.set(day, entry)
  }

  const points = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      kwh: Math.round(v.kwh),
      outputKg: Math.round(v.kg),
      sec: round(v.kg > 0 ? v.kwh / v.kg : 0, 2),
      renewableKwh: Math.round(v.renewable),
      gridKwh: Math.round(v.grid),
    }))

  return simulateDelay(points)
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export interface WaterUseRow {
  use: WaterUse
  kl: number
  sharePct: number
  /** Litres per kilogram of yarn. */
  litresPerKg: number
  changePct: number
  /** True when the water evaporates and never comes back for reuse. */
  isConsumptive: boolean
  note: string
}

export interface WaterSourceRow {
  source: WaterSource
  kl: number
  sharePct: number
  costInr: number
  tariffInrPerKl: number
  /** False for recycled water, which is reuse rather than fresh abstraction. */
  isFreshAbstraction: boolean
  isSustainable: boolean
  changePct: number
}

export interface WaterUnitRow {
  factoryId: string
  name: string
  shortName: string
  kl: number
  klPrev: number
  changePct: number
  litresPerKg: number
  litresPerKgPrev: number
  intensityChangePct: number
  sharePct: number
  employees: number
  litresPerPersonDay: number
  status: 'worse' | 'better' | 'steady'
}

export interface WaterLossRow {
  category: string
  kl: number
  sharePct: number
  costInr: number
  cause: string
  action: string
  recoverablePct: number
  recoverableKl: number
}

/** Intake, what evaporates and what returns — the numbers have to close. */
export interface WaterBalance {
  /** Everything pumped, including what leaks before reaching a use. */
  pumpedIntakeKl: number
  /** What actually reaches humidification, cooling, taps and hoses. */
  totalAppliedKl: number
  /** Pumped but never delivered — leaks and overflow. */
  neverDeliveredKl: number
  freshIntakeKl: number
  recycledKl: number
  rainwaterKl: number
  /** Evaporated into the halls and cooling towers — gone for good. */
  evaporatedKl: number
  /** Leaves as sewage, most of which the STP recovers. */
  dischargedKl: number
  recoveredByStpKl: number
  /** Fresh water genuinely consumed once recovery is netted off. */
  netFreshConsumedKl: number
}

export interface WaterOverview {
  periodDays: number
  totalKl: number
  freshIntakeKl: number
  /** The headline intensity — litres of water per kilogram of yarn. */
  litresPerKg: number
  litresPerKgPrev: number
  intensityChangePct: number
  totalChangePct: number
  costInr: number
  costChangePct: number
  costPerKgInr: number
  recycledSharePct: number
  recycledSharePrevPct: number
  rainwaterKl: number
  sustainableSharePct: number
  litresPerPersonDay: number
  avgDailyKl: number
  peakDailyKl: number
}

export interface WaterTrendPoint {
  date: string
  kl: number
  freshKl: number
  recycledKl: number
  litresPerKg: number
}

export interface WaterUsageReport {
  overview: WaterOverview
  byUse: WaterUseRow[]
  bySource: WaterSourceRow[]
  byUnit: WaterUnitRow[]
  losses: WaterLossRow[]
  balance: WaterBalance
  trend: WaterTrendPoint[]
  /** One sentence naming the thing to fix first. */
  headline: string
}

const waterUseNotes: Record<WaterUse, { note: string; consumptive: boolean }> = {
  'Humidification make-up': {
    note: 'Evaporated into the spinning halls to hold 55% RH. Cotton spins badly in dry air, so this is not optional — but none of it comes back.',
    consumptive: true,
  },
  'Cooling & compressors': {
    note: 'Make-up for the compressor and chiller circuits. Most evaporates in the towers; the rest leaves as blowdown.',
    consumptive: true,
  },
  'Domestic & canteen': {
    note: 'Washrooms, drinking water and the canteen for a 1,600-person site. Returns as sewage, so the STP can recover half of it.',
    consumptive: false,
  },
  'Cleaning & housekeeping': {
    note: 'Floor washing and machine cleaning. Mostly returns to drain carrying cotton dust.',
    consumptive: false,
  },
}

function aggregateWater(records: EnergyDayRecord[]) {
  const byUse = waterUseList.reduce(
    (acc, use) => {
      acc[use] = sum(records.map((r) => r.waterKlByUse[use] ?? 0))
      return acc
    },
    {} as Record<WaterUse, number>,
  )
  const bySource = waterSourceList.reduce(
    (acc, src) => {
      acc[src] = sum(records.map((r) => r.waterKlBySource[src] ?? 0))
      return acc
    },
    {} as Record<WaterSource, number>,
  )
  const totalKl = sum(records.map((r) => r.waterKl))
  const outputKg = sum(records.map((r) => r.outputKg))
  const recycledKl = bySource['Recycled (STP)']
  const days = new Set(records.map((r) => r.date.slice(0, 10))).size

  return {
    byUse,
    bySource,
    totalKl,
    outputKg,
    recycledKl,
    rainwaterKl: bySource['Rainwater harvested'],
    freshIntakeKl: totalKl - recycledKl,
    litresPerKg: outputKg > 0 ? (totalKl * 1000) / outputKg : 0,
    costInr: sum(waterSourceList.map((s) => bySource[s] * waterTariffInrPerKl[s])),
    days,
  }
}

/** Water, in full: what is drawn, where it goes, what leaks, and who uses most. */
export async function getWaterUsage(
  preset: DateRangePreset = '30d',
  factoryId: FactoryId = 'all',
): Promise<WaterUsageReport> {
  const { current, previous } = windows(preset)
  const currentRecords = recordsIn(current, factoryId)
  const now = aggregateWater(currentRecords)
  const prev = aggregateWater(recordsIn(previous, factoryId))

  const employees = sum(
    factories
      .filter((f) => factoryId === 'all' || f.id === factoryId)
      .map((f) => employeesByUnit[f.id] ?? 0),
  )

  // --- daily trend --------------------------------------------------------
  const byDay = new Map<string, { kl: number; recycled: number; kg: number }>()
  for (const r of currentRecords) {
    const day = r.date.slice(0, 10)
    const e = byDay.get(day) ?? { kl: 0, recycled: 0, kg: 0 }
    e.kl += r.waterKl
    e.recycled += r.waterKlBySource['Recycled (STP)'] ?? 0
    e.kg += r.outputKg
    byDay.set(day, e)
  }
  const trend: WaterTrendPoint[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      kl: round(v.kl),
      freshKl: round(v.kl - v.recycled),
      recycledKl: round(v.recycled),
      litresPerKg: round(v.kg > 0 ? (v.kl * 1000) / v.kg : 0, 2),
    }))
  const dailyKl = trend.map((t) => t.kl)

  const overview: WaterOverview = {
    periodDays: now.days,
    totalKl: round(now.totalKl),
    freshIntakeKl: round(now.freshIntakeKl),
    litresPerKg: round(now.litresPerKg, 2),
    litresPerKgPrev: round(prev.litresPerKg, 2),
    intensityChangePct: round(pctChange(now.litresPerKg, prev.litresPerKg)),
    totalChangePct: round(pctChange(now.totalKl, prev.totalKl)),
    costInr: Math.round(now.costInr),
    costChangePct: round(pctChange(now.costInr, prev.costInr)),
    costPerKgInr: round(now.outputKg > 0 ? now.costInr / now.outputKg : 0, 2),
    recycledSharePct: round(now.totalKl > 0 ? (now.recycledKl / now.totalKl) * 100 : 0),
    recycledSharePrevPct: round(prev.totalKl > 0 ? (prev.recycledKl / prev.totalKl) * 100 : 0),
    rainwaterKl: round(now.rainwaterKl),
    sustainableSharePct: round(
      now.totalKl > 0 ? ((now.recycledKl + now.rainwaterKl) / now.totalKl) * 100 : 0,
    ),
    litresPerPersonDay:
      employees > 0 && now.days > 0
        ? round((now.byUse['Domestic & canteen'] * 1000) / employees / now.days)
        : 0,
    avgDailyKl: round(now.days > 0 ? now.totalKl / now.days : 0),
    peakDailyKl: round(dailyKl.length ? Math.max(...dailyKl) : 0),
  }

  const byUse: WaterUseRow[] = waterUseList
    .map((use) => ({
      use,
      kl: round(now.byUse[use]),
      sharePct: round(now.totalKl > 0 ? (now.byUse[use] / now.totalKl) * 100 : 0),
      litresPerKg: round(now.outputKg > 0 ? (now.byUse[use] * 1000) / now.outputKg : 0, 2),
      changePct: round(pctChange(now.byUse[use], prev.byUse[use])),
      isConsumptive: waterUseNotes[use].consumptive,
      note: waterUseNotes[use].note,
    }))
    .filter((r) => r.kl > 0)
    .sort((a, b) => b.kl - a.kl)

  const bySource: WaterSourceRow[] = waterSourceList
    .map((source) => ({
      source,
      kl: round(now.bySource[source]),
      sharePct: round(now.totalKl > 0 ? (now.bySource[source] / now.totalKl) * 100 : 0),
      costInr: Math.round(now.bySource[source] * waterTariffInrPerKl[source]),
      tariffInrPerKl: waterTariffInrPerKl[source],
      isFreshAbstraction: source === 'Borewell' || source === 'Municipal (TWAD)',
      isSustainable: source === 'Rainwater harvested' || source === 'Recycled (STP)',
      changePct: round(pctChange(now.bySource[source], prev.bySource[source])),
    }))
    .filter((r) => r.kl > 0)
    .sort((a, b) => b.kl - a.kl)

  // --- by unit ------------------------------------------------------------
  const byUnit: WaterUnitRow[] = factories
    .filter((f) => unitEnergyModel[f.id] && (factoryId === 'all' || f.id === factoryId))
    .map((factory) => {
      const u = aggregateWater(recordsIn(current, factory.id))
      const p = aggregateWater(recordsIn(previous, factory.id))
      const headcount = employeesByUnit[factory.id] ?? 0
      const intensityChangePct = pctChange(u.litresPerKg, p.litresPerKg)
      return {
        factoryId: factory.id,
        name: factoryName.get(factory.id) ?? factory.id,
        shortName: factoryShortName.get(factory.id) ?? factory.id,
        kl: round(u.totalKl),
        klPrev: round(p.totalKl),
        changePct: round(pctChange(u.totalKl, p.totalKl)),
        litresPerKg: round(u.litresPerKg, 2),
        litresPerKgPrev: round(p.litresPerKg, 2),
        intensityChangePct: round(intensityChangePct),
        sharePct: round(now.totalKl > 0 ? (u.totalKl / now.totalKl) * 100 : 0),
        employees: headcount,
        litresPerPersonDay:
          headcount > 0 && u.days > 0
            ? round((u.byUse['Domestic & canteen'] * 1000) / headcount / u.days)
            : 0,
        status: (intensityChangePct > 2
          ? 'worse'
          : intensityChangePct < -2
            ? 'better'
            : 'steady') as 'worse' | 'better' | 'steady',
      }
    })
    .sort((a, b) => b.kl - a.kl)

  // --- losses -------------------------------------------------------------
  const rate = now.totalKl > 0 ? now.costInr / now.totalKl : 0
  const rawLosses = [
    {
      category: 'Distribution leaks',
      kl: now.totalKl * waterLossCoefficients.distributionLeakRate,
      cause: `Around ${round(waterLossCoefficients.distributionLeakRate * 100)}% of everything pumped never reaches a tap or a nozzle — the norm for buried industrial pipework with no zone metering.`,
      action: 'Meter each unit separately and run a night-flow test: a zone still drawing water at 3 a.m. with the frames stopped is leaking.',
      recoverablePct: 65,
    },
    {
      category: 'Humidification drift',
      kl: now.byUse['Humidification make-up'] * waterLossCoefficients.humidificationDriftRate,
      cause: 'Water leaving the air washers as droplets instead of vapour — part of the evaporated figure, but it wets the ducts rather than conditioning the hall, so it does no work at all.',
      action: 'Service the eliminator plates and check the nozzle spray pattern — worn nozzles atomise poorly and throw droplets.',
      recoverablePct: 55,
    },
    {
      category: 'Cooling tower drift',
      kl: now.byUse['Cooling & compressors'] * waterLossCoefficients.coolingDriftRate,
      cause: 'Droplets carried out of the cooling towers on the air stream — inside the evaporated figure, but over and above the evaporation that actually does the cooling.',
      action: 'Fit or replace drift eliminators and hold the fans at the lowest speed the heat load allows.',
      recoverablePct: 45,
    },
    {
      category: 'Overhead tank overflow',
      kl: now.totalKl * waterLossCoefficients.tankOverflowRate,
      cause: 'Tanks filled on a timer rather than a level signal spill once full, usually overnight when nobody is there to see it.',
      action: 'Fit float-switch interlocks on the pump starters — the cheapest fix on this list, and almost fully recoverable.',
      recoverablePct: 90,
    },
  ]

  const losses: WaterLossRow[] = rawLosses
    .filter((l) => l.kl > 0)
    .map((l) => ({
      category: l.category,
      kl: round(l.kl),
      sharePct: round(now.totalKl > 0 ? (l.kl / now.totalKl) * 100 : 0),
      costInr: Math.round(l.kl * rate),
      cause: l.cause,
      action: l.action,
      recoverablePct: l.recoverablePct,
      recoverableKl: round((l.kl * l.recoverablePct) / 100),
    }))
    .sort((a, b) => b.kl - a.kl)

  // --- balance ------------------------------------------------------------
  // Every litre applied either leaves as vapour or leaves down a drain, so
  // these two have to add back to the applied total exactly.
  const evaporatedKl =
    now.byUse['Humidification make-up'] +
    now.byUse['Cooling & compressors'] * 0.75 +
    // Drinking, cooking and washing water that never reaches the sewer.
    now.byUse['Domestic & canteen'] * 0.15 +
    // Wash water that dries off the floor rather than running to drain.
    now.byUse['Cleaning & housekeeping'] * 0.3
  const dischargedKl =
    now.byUse['Domestic & canteen'] * 0.85 +
    now.byUse['Cleaning & housekeeping'] * 0.7 +
    now.byUse['Cooling & compressors'] * 0.25

  // Leaks and overflow happen upstream of any use, so they sit on top of the
  // applied total rather than inside it.
  const neverDeliveredKl = sum(
    losses.filter((l) => l.category === 'Distribution leaks' || l.category === 'Overhead tank overflow')
      .map((l) => l.kl),
  )

  const balance: WaterBalance = {
    pumpedIntakeKl: round(now.totalKl + neverDeliveredKl),
    totalAppliedKl: round(now.totalKl),
    neverDeliveredKl: round(neverDeliveredKl),
    freshIntakeKl: round(now.freshIntakeKl),
    recycledKl: round(now.recycledKl),
    rainwaterKl: round(now.rainwaterKl),
    evaporatedKl: round(evaporatedKl),
    dischargedKl: round(dischargedKl),
    recoveredByStpKl: round(now.recycledKl),
    netFreshConsumedKl: round(now.freshIntakeKl - now.recycledKl),
  }

  const topLoss = losses[0]
  const thirstiest = byUnit.slice().sort((a, b) => b.litresPerKg - a.litresPerKg)[0]
  const headline = topLoss
    ? `${round(now.litresPerKg, 2)} litres of water go into every kilogram of yarn. ${topLoss.category} is the biggest single leak at ${Math.round(topLoss.kl)} kL${
        thirstiest ? `, and ${thirstiest.shortName} is the thirstiest unit at ${thirstiest.litresPerKg} L/kg` : ''
      }.`
    : `${round(now.litresPerKg, 2)} litres of water go into every kilogram of yarn.`

  return simulateDelay({
    overview,
    byUse,
    bySource,
    byUnit,
    losses,
    balance,
    trend,
    headline,
  })
}
