import type { VacationStatus } from '@/types'

const labels: Record<VacationStatus, string> = {
  pending: 'Ausstehend',
  approved: 'Genehmigt',
  rejected: 'Abgelehnt',
}

export default function StatusBadge({ status }: { status: VacationStatus }) {
  return <span className={`badge-${status}`}>{labels[status]}</span>
}
