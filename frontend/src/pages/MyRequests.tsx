import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import type { VacationRequest } from '@/types'
import { LEAVE_TYPE_LABELS } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function MyRequests() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api.get<VacationRequest[]>('/vacations/my').then((r) => {
      setRequests(r.data)
      setLoading(false)
    })
  }

  useEffect(load, [])

  const cancel = async (id: number) => {
    if (!confirm('Antrag wirklich stornieren?')) return
    try {
      await api.delete(`/vacations/${id}`)
      toast.success('Antrag storniert')
      load()
    } catch {
      toast.error('Fehler beim Stornieren')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Meine Anträge</h1>
          <p className="text-brand-gray mt-1">Alle deine Urlaubsanträge im Überblick</p>
        </div>
        <Link to="/request" className="btn-primary">+ Neu beantragen</Link>
      </div>

      {loading ? (
        <p className="text-brand-gray">Lädt …</p>
      ) : requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-brand-gray">Noch keine Anträge vorhanden.</p>
          <Link to="/request" className="btn-primary mt-4 inline-block">Ersten Urlaub beantragen</Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden p-0 hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Zeitraum</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Tage</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Art</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Grund</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-brand-gray uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {format(new Date(r.start_date), 'd. MMM', { locale: de })} –{' '}
                      {format(new Date(r.end_date), 'd. MMM yyyy', { locale: de })}
                    </td>
                    <td className="px-6 py-4 text-brand-gray">{r.working_days}</td>
                    <td className="px-6 py-4 text-brand-gray">{LEAVE_TYPE_LABELS[r.leave_type]}</td>
                    <td className="px-6 py-4 text-brand-gray max-w-xs truncate">{r.reason || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'pending' && (
                        <button onClick={() => cancel(r.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                          Stornieren
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {requests.map((r) => (
              <div key={r.id} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {format(new Date(r.start_date), 'd. MMM', { locale: de })} –{' '}
                    {format(new Date(r.end_date), 'd. MMM yyyy', { locale: de })}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-xs text-brand-gray">{LEAVE_TYPE_LABELS[r.leave_type]} · {r.working_days} Arbeitstage{r.reason ? ` · ${r.reason}` : ''}</p>
                {r.status === 'pending' && (
                  <button onClick={() => cancel(r.id)} className="text-xs text-red-500 font-medium">
                    Stornieren
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
