import { create } from 'zustand'
import type { DateRangePreset, FactoryId, UserRole } from '@/types'

interface AppState {
  factoryId: FactoryId
  dateRangePreset: DateRangePreset
  userRole: UserRole
  setFactoryId: (factoryId: FactoryId) => void
  setDateRangePreset: (preset: DateRangePreset) => void
  setUserRole: (role: UserRole) => void
}

export const useAppStore = create<AppState>((set) => ({
  factoryId: 'all',
  dateRangePreset: '7d',
  userRole: 'MD/CEO',
  setFactoryId: (factoryId) => set({ factoryId }),
  setDateRangePreset: (dateRangePreset) => set({ dateRangePreset }),
  setUserRole: (userRole) => set({ userRole }),
}))
