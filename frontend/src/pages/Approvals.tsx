import { useEffect, useState } from 'react'
import api from '@/api/client'
import type { VacationRequest } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function Approvals() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api
      .get<VacationRequest[]>('/vacations/team', { params: { status: 'pending' } })
      .then((r) => {
        setRequests(r.data)
        setLoading(false)
      })
  }

  useEffect(load, [])

  const review = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/vacations/${id}/review`, { status })
      toast.success(status === 'approved' ? 'Genehmigt' : 'Abgelehnt')
      load()
    } catch {
      toast.error('Fehler beim Bearbeiten')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Genehmigungen</h1>
        <p className="text-brand-gray mt-1">Beantragte Urlaubsanträge deiner Mitarbeitenden</p>
      </div>

      {loading ? (
        <p className="text-brand-gray">Lädt …</p>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">✓</p>
          <p className="text-brand-gray font-medium">Keine beantragten Anträge</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Left bar */}
              <div className="w-1 self-stretch rounded-full bg-brand-gold flex-shrink-0 hidden sm:block" />

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-brand-dark">{r.employee.full_name}</span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-sm text-brand-gray">
                  {format(new Date(r.start_date), 'd. MMM', { locale: de })} –{' '}
                  {format(new Date(r.end_date), 'd. MMM yyyy', { locale: de })} ·{' '}
                  <strong>{r.working_days} Arbeitstage</strong>
                </p>
                {r.reason && <p className="text-xs text-brand-gray mt-1">„{r.reason}"</p>}
                <p className="text-xs text-brand-gray mt-1 opacity-60">
                  Eingereicht: {format(new Date(r.created_at), 'd. MMM yyyy', { locale: de })}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => review(r.id, 'approved')}
                  className="btn-success text-sm py-2 px-4"
                >
                  Genehmigen
                </button>
                <button
                  onClick={() => review(r.id, 'rejected')}
                  className="btn-danger text-sm py-2 px-4"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
