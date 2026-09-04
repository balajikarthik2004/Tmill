export type UserRole = 'MD/CEO' | 'Production' | 'Quality' | 'Purchase' | 'Maintenance' | 'Sales'

export interface AppUser {
  name: string
  role: UserRole
  initials: string
  email: string
}

export const userRoleTitles: Record<UserRole, string> = {
  'MD/CEO': 'Managing Director',
  Production: 'Production Head',
  Quality: 'Quality Head',
  Purchase: 'Purchase Head',
  Maintenance: 'Maintenance Head',
  Sales: 'Sales Head',
}
