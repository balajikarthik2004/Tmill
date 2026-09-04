import type { FactoryId, ProcessName } from './factory'
import type { ID, ISODate } from './common'

export type MachineStatus = 'Running' | 'Idle' | 'Breakdown' | 'Maintenance'

export interface Machine {
  id: ID
  code: string // e.g. RF-021
  name: string
  factoryId: FactoryId
  process: ProcessName
  make: string
  installedYear: number
  status: MachineStatus
  oeePct: number
  utilizationPct: number
  lastMaintenanceDate: ISODate
  nextPmDueDate: ISODate
  isCritical: boolean
}
