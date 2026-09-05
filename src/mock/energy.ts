/**
 * Energy and utilities history — 90 days of daily meter readings per unit.
 *
 * Built on a physical model rather than random numbers, so the analytics on the
 * energy page reach conclusions that are actually true of the data:
 *
 *   total kWh = variable load (scales with kilograms and with how fine the
 *               count is) + fixed load (humidification, compressed air and
 *               lighting, which run whether the frames are spinning or not)
 *
 * That structure is what makes specific energy consumption (kWh/kg) move for
 * reasons a plant engineer would recognise — a lighter day spreads the fixed
 * load over fewer kilograms, a finer count draws more power per kilogram, dry
 * ambient air makes the humidification plant work harder.
 *
 * Calibrated to the published plant: 86,112 spindles, 480 rotors, ~25,000 kg of
 * yarn a day, which lands the group at roughly 3.1 kWh/kg and a 3.2 MW average
 * draw — both in the normal band for an Indian combed-cotton spinning group.
 * Tariffs, emission factors and loss coefficients are industry reference values.
 */
import type { EnergyDayRecord, EnergyEndUse, EnergySource, WaterSource, WaterUse } from '@/types'
import { makeRng } from '@/lib/random'
import { factories } from './factories'

const rng = makeRng(707)

const round1 = (value: number) => Math.round(value * 10) / 10

export const ENERGY_HISTORY_DAYS = 90

/** Cost of a unit from each source, ₹/kWh. Captive sources carry wheeling charges. */
export const tariffInrPerKwh: Record<EnergySource, number> = {
  'Captive Wind': 4.35,
  Solar: 3.6,
  'Grid (TANGEDCO)': 8.75,
  'Diesel Genset': 21.5,
}

/** kg CO₂e per kWh, lifecycle basis. Grid figure is the Indian CEA average. */
export const co2KgPerKwh: Record<EnergySource, number> = {
  'Captive Wind': 0.011,
  Solar: 0.041,
  'Grid (TANGEDCO)': 0.71,
  'Diesel Genset': 0.8,
}

/**
 * How each unit consumes power.
 *
 * `variableSec` is kWh per kilogram at the unit's reference count; `fixedKwh` is
 * the daily base load that runs regardless of output. `refCount` is the NE count
 * those figures are quoted at.
 */
export const unitEnergyModel: Record<
  string,
  { variableSec: number; fixedKwh: number; refCount: number; targetKg: number }
> = {
  // Fine counts, NE 60s–140s. Finest yarn in the group, so the highest kWh/kg.
  'mill-1': { variableSec: 2.94, fixedKwh: 7800, refCount: 80, targetKg: 6200 },
  // Medium counts, NE 30s–60s.
  'mill-2': { variableSec: 2.23, fixedKwh: 6420, refCount: 45, targetKg: 7400 },
  // Coarse counts, NE 16s–30s. Most efficient per kilogram.
  'mill-3': { variableSec: 1.7, fixedKwh: 4130, refCount: 24, targetKg: 6900 },
  // OE NE 6s–12s plus the post-spinning services. Rotor speed keeps this high
  // for such coarse counts.
  'oe-unit': { variableSec: 1.98, fixedKwh: 2810, refCount: 10, targetKg: 4500 },
}

/**
 * Ring spinning power rises with count, roughly as a power law: doubling the
 * count does not double the load, but it comes close to a 1.5x step.
 */
export const COUNT_EXPONENT = 0.55

/**
 * Extra humidification load per percentage point that ambient humidity sits
 * below the 55% RH the spinning halls are held at.
 */
export const HUMIDIFICATION_TARGET_RH = 55
export const HUMIDIFICATION_SENSITIVITY = 0.009

/** Share of the day's power going to each end use. */
const endUseShares: Record<string, Partial<Record<EnergyEndUse, number>>> = {
  spinning: {
    'Ring Spinning': 0.42,
    'Blow Room & Carding': 0.11,
    'Combing, Drawing & Roving': 0.1,
    'Winding & TFO': 0.08,
    Humidification: 0.18,
    'Compressed Air': 0.07,
    'Lighting & Utilities': 0.04,
  },
  openEnd: {
    'Open End': 0.46,
    'Winding & TFO': 0.22,
    Humidification: 0.15,
    'Compressed Air': 0.08,
    'Lighting & Utilities': 0.09,
  },
}

/**
 * Benchmark shares a well-run mill would hold each end use to — held per plant
 * profile, because they are only meaningful within a comparable plant. Ring
 * spinning is 42% of a spinning mill's load and 0% of the OE unit's; comparing
 * either against a group-wide average would be meaningless. The service blends
 * these by each unit's share of the scope being viewed.
 */
export const endUseBenchmarkByProfile: Record<
  'spinning' | 'openEnd',
  Partial<Record<EnergyEndUse, number>>
> = {
  spinning: {
    'Ring Spinning': 0.42,
    'Blow Room & Carding': 0.11,
    'Combing, Drawing & Roving': 0.1,
    'Winding & TFO': 0.08,
    Humidification: 0.16,
    'Compressed Air': 0.06,
    'Lighting & Utilities': 0.035,
  },
  openEnd: {
    'Open End': 0.46,
    'Winding & TFO': 0.22,
    Humidification: 0.13,
    'Compressed Air': 0.07,
    'Lighting & Utilities': 0.08,
  },
}

/** Which benchmark profile a unit is judged against. */
export function energyProfileFor(factoryId: string): 'spinning' | 'openEnd' {
  return factoryId === 'oe-unit' ? 'openEnd' : 'spinning'
}

const allEndUses: EnergyEndUse[] = [
  'Ring Spinning',
  'Open End',
  'Blow Room & Carding',
  'Combing, Drawing & Roving',
  'Winding & TFO',
  'Humidification',
  'Compressed Air',
  'Lighting & Utilities',
]

const allSources: EnergySource[] = ['Captive Wind', 'Solar', 'Grid (TANGEDCO)', 'Diesel Genset']

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/**
 * Water standards.
 *
 * A spinning mill is not a wet-processing mill: there is no dyeing and no
 * process effluent. The draw is humidification make-up (which evaporates into
 * the spinning halls and never comes back), machine and compressor cooling, and
 * the domestic load of a 1,600-person site. That puts the plant around
 * 5 litres per kilogram of yarn — an order of magnitude below a dyeing house.
 */
export const waterStandards = {
  /** Evaporated into the halls to hold 55% RH, per kg of yarn. */
  humidificationLPerKg: 2.4,
  /** Cooling and compressor make-up, per kWh drawn. */
  coolingLPerKwh: 0.23,
  /** Per person per day — canteen, washrooms and drinking water. */
  domesticLPerPersonDay: 25,
  /** Floor washing and machine cleaning, per kg of yarn. */
  cleaningLPerKg: 0.28,
  /** Share of domestic water recovered through the sewage treatment plant. */
  stpRecoveryRate: 0.5,
} as const

/** Headcount by unit — 1,600 across the group, as published. */
export const employeesByUnit: Record<string, number> = {
  'mill-1': 460,
  'mill-2': 470,
  'mill-3': 380,
  'oe-unit': 290,
}

/** Cost of a kilolitre from each source, ₹/kL. */
export const waterTariffInrPerKl: Record<WaterSource, number> = {
  Borewell: 12,
  'Municipal (TWAD)': 45,
  'Rainwater harvested': 6,
  'Recycled (STP)': 18,
}

/**
 * Where water is lost between the source and the work it should do. Each is a
 * published norm for an industrial distribution network, applied to this
 * plant's own metered volumes.
 */
export const waterLossCoefficients = {
  /** Buried pipework leakage across an unmonitored industrial network. */
  distributionLeakRate: 0.06,
  /** Overhead tanks overflowing where there is no level interlock. */
  tankOverflowRate: 0.015,
  /** Droplets carried out of the cooling towers rather than evaporating usefully. */
  coolingDriftRate: 0.012,
  /** Water carried out of the humidification plant as droplets, not vapour. */
  humidificationDriftRate: 0.04,
} as const

/**
 * Rainwater harvesting follows the Madurai monsoon: a strong north-east season
 * from October to December, lighter south-west rain from June to September.
 */
function rainwaterShare(date: Date) {
  const month = date.getMonth()
  if (month >= 9 && month <= 11) return rng.float(0.16, 0.24, 3)
  if (month >= 5 && month <= 8) return rng.float(0.06, 0.12, 3)
  return rng.float(0.01, 0.04, 3)
}

const allWaterUses: WaterUse[] = [
  'Humidification make-up',
  'Cooling & compressors',
  'Domestic & canteen',
  'Cleaning & housekeeping',
]

const allWaterSources: WaterSource[] = [
  'Borewell',
  'Municipal (TWAD)',
  'Rainwater harvested',
  'Recycled (STP)',
]

export const waterUseList = allWaterUses
export const waterSourceList = allWaterSources

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(6, 0, 0, 0)
  return d.toISOString()
}

/**
 * Tamil Nadu's wind season runs May to September, so captive wind carries a
 * large share of the load in those months and falls away afterwards.
 */
function windAvailability(date: Date) {
  const month = date.getMonth() // 0 = January
  const inSeason = month >= 4 && month <= 8
  const base = inSeason ? 0.52 : 0.24
  return Math.max(0.08, Math.min(0.62, base * rng.float(0.72, 1.24, 3)))
}

/**
 * Count mix actually drifts — mills move onto finer or coarser programmes as
 * the order book changes. Spinning Mill II has been pulled onto finer counts
 * over the last month to cover a run of 60s orders, which is the kind of shift
 * the variance analysis on the energy page is built to detect.
 */
function averageCountFor(factoryId: string, dayOffset: number) {
  const model = unitEnergyModel[factoryId]
  const drift =
    factoryId === 'mill-2' && dayOffset < 30
      ? 1 + ((30 - dayOffset) / 30) * 0.24 // pulled onto finer counts recently
      : 1
  return Math.round(model.refCount * drift * rng.float(0.94, 1.06, 3) * 10) / 10
}

export const energyRecords: EnergyDayRecord[] = []

for (let dayOffset = ENERGY_HISTORY_DAYS - 1; dayOffset >= 0; dayOffset--) {
  const dateIso = isoDaysAgo(dayOffset)
  const date = new Date(dateIso)
  const dow = date.getDay()
  const weekendFactor = dow === 0 ? 0.58 : dow === 6 ? 0.85 : 1

  // Ambient humidity at Kappalur: humid most of the year, with dry spells.
  const ambientRhPct = Math.round(rng.float(42, 76, 1) * 10) / 10

  const windShare = windAvailability(date)
  const solarShare = rng.float(0.1, 0.17, 3)
  const rainShare = rainwaterShare(date)
  // The grid drops occasionally and the DG sets pick up the difference.
  const dieselShare = rng.bool(0.05) ? rng.float(0.02, 0.05, 3) : 0

  for (const factory of factories) {
    const model = unitEnergyModel[factory.id]
    if (!model) continue

    const avgCount = averageCountFor(factory.id, dayOffset)
    const outputKg = Math.round(model.targetKg * weekendFactor * rng.float(0.88, 1.07, 3))

    // Variable load: scales with output, and with how fine the count is.
    const countFactor = (avgCount / model.refCount) ** COUNT_EXPONENT
    const variableKwh = outputKg * model.variableSec * countFactor

    // Fixed load: runs whether or not the frames are turning, and climbs when
    // the ambient air is dry.
    const humidityFactor =
      1 + Math.max(0, HUMIDIFICATION_TARGET_RH - ambientRhPct) * HUMIDIFICATION_SENSITIVITY
    const fixedKwh = model.fixedKwh * humidityFactor * rng.float(0.97, 1.04, 3)

    const totalKwh = Math.round(variableKwh + fixedKwh)

    const shares = factory.id === 'oe-unit' ? endUseShares.openEnd : endUseShares.spinning
    const kwhByEndUse = allEndUses.reduce(
      (acc, use) => {
        acc[use] = Math.round(totalKwh * (shares[use] ?? 0))
        return acc
      },
      {} as Record<EnergyEndUse, number>,
    )

    const gridShare = Math.max(0, 1 - windShare - solarShare - dieselShare)
    const sourceShares: Record<EnergySource, number> = {
      'Captive Wind': windShare,
      Solar: solarShare,
      'Grid (TANGEDCO)': gridShare,
      'Diesel Genset': dieselShare,
    }
    const kwhBySource = allSources.reduce(
      (acc, source) => {
        acc[source] = Math.round(totalKwh * sourceShares[source])
        return acc
      },
      {} as Record<EnergySource, number>,
    )

    // --- water ------------------------------------------------------------
    // Humidification make-up evaporates into the halls, so it rises with the
    // same dry-air factor that drives the humidification power load.
    const employees = employeesByUnit[factory.id] ?? 0
    const humidificationKl =
      (outputKg * waterStandards.humidificationLPerKg * humidityFactor * rng.float(0.94, 1.08, 3)) /
      1000
    const coolingKl = (totalKwh * waterStandards.coolingLPerKwh * rng.float(0.93, 1.09, 3)) / 1000
    // Domestic draw follows headcount, not output — it barely moves on a light day.
    const domesticKl = (employees * waterStandards.domesticLPerPersonDay * rng.float(0.95, 1.06, 3)) / 1000
    const cleaningKl = (outputKg * waterStandards.cleaningLPerKg * rng.float(0.9, 1.12, 3)) / 1000

    const waterKlByUse: Record<WaterUse, number> = {
      'Humidification make-up': round1(humidificationKl),
      'Cooling & compressors': round1(coolingKl),
      'Domestic & canteen': round1(domesticKl),
      'Cleaning & housekeeping': round1(cleaningKl),
    }
    const waterTotalKl = allWaterUses.reduce((total, use) => total + waterKlByUse[use], 0)

    // Treated sewage is put back to work on gardening, flushing and cooling
    // make-up, so it offsets fresh intake rather than adding to it.
    const recycledKl = domesticKl * waterStandards.stpRecoveryRate
    const rainKl = Math.min(waterTotalKl - recycledKl, waterTotalKl * rainShare)
    const freshNeededKl = Math.max(0, waterTotalKl - recycledKl - rainKl)

    const waterKlBySource: Record<WaterSource, number> = {
      Borewell: round1(freshNeededKl * 0.72),
      'Municipal (TWAD)': round1(freshNeededKl * 0.28),
      'Rainwater harvested': round1(rainKl),
      'Recycled (STP)': round1(recycledKl),
    }

    energyRecords.push({
      date: dateIso,
      factoryId: factory.id,
      outputKg,
      totalKwh,
      kwhBySource,
      kwhByEndUse,
      waterKl: round1(waterTotalKl),
      waterKlByUse,
      waterKlBySource,
      compressedAirNm3: Math.round(outputKg * 0.52 * rng.float(0.94, 1.08, 3)),
      // A genset delivers roughly 3.5 kWh a litre.
      dieselL: Math.round(kwhBySource['Diesel Genset'] / 3.5),
      powerFactor: rng.float(0.94, 0.995, 3),
      ambientRhPct,
      avgCount,
    })
  }
}

// ---------------------------------------------------------------------------
// Loss coefficients
// ---------------------------------------------------------------------------

/**
 * Reference coefficients for the loss model. Each is a published industry norm
 * for a spinning plant, applied against this plant's own metered data rather
 * than assumed outright.
 */
export const lossCoefficients = {
  /** Share of compressed air generation typically lost through leaks. */
  compressedAirLeakRate: 0.22,
  /** Transformer plus cable losses between the incomer and the machines. */
  distributionLossRate: 0.026,
  /** Power factor the utility expects before it levies a penalty. */
  targetPowerFactor: 0.98,
  /** A machine idling still draws this share of its running load. */
  idleLoadShare: 0.35,
  /** Efficiency gap between a pre-IE3 motor and a modern equivalent. */
  ageingMotorPenalty: 0.04,
  /** Machines installed before this year are treated as pre-IE3. */
  ie3CutoffYear: 2012,
  /** Energy burnt restarting and re-piecing after a breakdown, per event hour. */
  breakdownRestartKwhPerHour: 42,
} as const

export const energySourceList = allSources
export const energyEndUseList = allEndUses
