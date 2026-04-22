import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/api/client'
import type { RemainingDays } from '@/types'
import toast from 'react-hot-toast'
import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns'

function countWorkingDays(start: string, end: string): number {
  if (!start || !end || start > end) return 0
  try {
    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })
    return days.filter((d) => !isWeekend(d)).length
  } catch {
    return 0
  }
}

export default function RequestVacation() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<RemainingDays | null>(null)

  useEffect(() => {
    api.get<RemainingDays>('/vacations/remaining').then((r) => setRemaining(r.data))
  }, [])

  const workingDays = countWorkingDays(startDate, endDate)
  const enoughDays = remaining ? workingDays <= remaining.remaining_days : true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enoughDays) {
      toast.error('Nicht genug Urlaubstage verfügbar')
      return
    }
    setLoading(true)
    try {
      await api.post('/vacations/', {
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      })
      toast.success('Urlaubsantrag eingereicht!')
      navigate('/my-requests')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Fehler beim Einreichen'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Urlaub beantragen</h1>
        <p className="text-brand-gray mt-1">Fülle das Formular aus und reiche deinen Antrag ein.</p>
      </div>

      {remaining && (
        <div className="card flex items-center gap-4 bg-brand-dark text-white">
          <div className="w-1 self-stretch rounded-full bg-brand-gold flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">
              {remaining.remaining_days} Tage verfügbar
            </p>
            <p className="text-xs opacity-60">
              {remaining.used_days} von {remaining.total_days} Tagen genommen ·{' '}
              {remaining.pending_days} beantragt
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1.5">
              Von
            </label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1.5">
              Bis
            </label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              min={startDate || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {workingDays > 0 && (
          <div
            className={`text-sm font-medium px-4 py-2 rounded-lg ${
              enoughDays
                ? 'bg-teal-50 text-teal-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {workingDays} Arbeitstag{workingDays !== 1 ? 'e' : ''} ausgewählt
            {!enoughDays && ' — nicht genug verbleibende Tage!'}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-brand-gray uppercase tracking-wide mb-1.5">
            Grund <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            className="input resize-none h-24"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. Familienurlaub, Erholung …"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading || !enoughDays || workingDays === 0} className="btn-primary">
            {loading ? 'Wird eingereicht …' : 'Antrag einreichen'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
