import type { ID, ISODate } from './common'
import type { FactoryId } from './factory'

export interface MaintenanceSummary {
  breakdowns: number
  pmDue: number
  criticalMachines: number
  lowSpares: number
}

export interface PmTask {
  id: ID
  machineId: ID
  machineCode: string
  factoryId: FactoryId
  scheduledDate: ISODate
  frequency: 'Weekly' | 'Monthly' | 'Quarterly'
  status: 'Due' | 'Scheduled' | 'Completed' | 'Overdue'
  assignedTo: string
}

export interface BreakdownRecord {
  id: ID
  machineId: ID
  machineCode: string
  factoryId: FactoryId
  startTime: ISODate
  endTime?: ISODate
  durationHrs?: number
  reason: string
  status: 'Open' | 'In Progress' | 'Resolved'
}

export interface SparePart {
  id: ID
  partCode: string
  name: string
  compatibleMachines: string[]
  currentStock: number
  reorderLevel: number
  unit: string
  isLow: boolean
}
