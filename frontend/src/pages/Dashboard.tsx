import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { RemainingDays, VacationRequest } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [remaining, setRemaining] = useState<RemainingDays | null>(null)
  const [recent, setRecent] = useState<VacationRequest[]>([])

  useEffect(() => {
    api.get<RemainingDays>('/vacations/remaining').then((r) => setRemaining(r.data))
    api.get<VacationRequest[]>('/vacations/my').then((r) => setRecent(r.data.slice(0, 5)))
  }, [])

  const pct = remaining ? Math.round((remaining.used_days / remaining.total_days) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-brand-dark">
          Willkommen, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-brand-gray mt-1">Urlaubsübersicht {new Date().getFullYear()}</p>
      </div>

      {/* Stats */}
      {remaining && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Verbleibende Tage"
            value={remaining.remaining_days}
            total={remaining.total_days}
            color="#2B2931"
          />
          <StatCard
            label="Genommene Tage"
            value={remaining.used_days}
            total={remaining.total_days}
            color="#00A79D"
          />
          <StatCard
            label="Ausstehend"
            value={remaining.pending_days}
            total={remaining.total_days}
            color="#FBB040"
          />
        </div>
      )}

      {/* Progress bar */}
      {remaining && (
        <div className="card">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold">Urlaubsverbrauch {remaining.year}</span>
            <span className="text-brand-gray">
              {remaining.used_days} / {remaining.total_days} Tage
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                backgroundColor: pct > 80 ? '#ef4444' : '#2B2931',
              }}
            />
          </div>
          <p className="text-xs text-brand-gray mt-2">{pct}% verbraucht</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/request" className="btn-primary">
          + Urlaub beantragen
        </Link>
        <Link to="/my-requests" className="btn-secondary">
          Alle Anträge
        </Link>
      </div>

      {/* Recent requests */}
      {recent.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-heading font-semibold mb-4">Letzte Anträge</h2>
          <div className="divide-y divide-gray-50">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(r.start_date), 'd. MMM', { locale: de })} –{' '}
                    {format(new Date(r.end_date), 'd. MMM yyyy', { locale: de })}
                  </p>
                  <p className="text-xs text-brand-gray mt-0.5">{r.working_days} Arbeitstage</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  return (
    <div className="card flex items-start gap-4">
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-3xl font-heading font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-xs text-brand-gray mt-0.5">{label}</p>
        <p className="text-xs text-brand-gray">von {total} Tagen</p>
      </div>
    </div>
  )
}
