export type UserRole = 'employee' | 'manager' | 'admin'
export type VacationStatus = 'pending' | 'approved' | 'rejected'
export type LeaveType = 'bezahlter_urlaub' | 'elternzeit' | 'sonderurlaub_bezahlt' | 'sonderurlaub_unbezahlt' | 'ueberstundenabbau'

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  bezahlter_urlaub: 'Bezahlter Urlaub',
  elternzeit: 'Elternzeit',
  sonderurlaub_bezahlt: 'Sonderurlaub (bezahlt)',
  sonderurlaub_unbezahlt: 'Sonderurlaub (unbezahlt)',
  ueberstundenabbau: 'Überstundenabbau',
}

export const LEAVE_TYPE_COUNTS_QUOTA: Record<LeaveType, boolean> = {
  bezahlter_urlaub: true,
  elternzeit: false,
  sonderurlaub_bezahlt: false,
  sonderurlaub_unbezahlt: false,
  ueberstundenabbau: false,
}

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  created_at: string
}

export interface UserWithRelations extends User {
  managers: User[]
  subordinates: User[]
}

export interface VacationRequest {
  id: number
  employee_id: number
  employee: User
  start_date: string
  end_date: string
  working_days: number
  reason: string | null
  leave_type: LeaveType
  status: VacationStatus
  reviewed_by_id: number | null
  reviewer: User | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface RemainingDays {
  year: number
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
}

export interface TeamRemaining {
  employee: { id: number; full_name: string; email: string }
  year: number
  total_days: number
  used_days: number
  pending_days: number
  remaining_days: number
}
