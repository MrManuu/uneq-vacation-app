import { useEffect, useState, useMemo } from 'react'
import api from '@/api/client'
import type { TeamRemaining, VacationRequest } from '@/types'
import {
  format,
  eachDayOfInterval,
  parseISO,
  isWeekend,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { de } from 'date-fns/locale'

const MONTHS = eachMonthOfInterval({
  start: startOfYear(new Date()),
  end: endOfYear(new Date()),
})

function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function getNRWHolidays(year: number): Set<string> {
  const easter = getEasterDate(year)
  const add = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return new Set([
    fmt(new Date(year, 0, 1)),
    fmt(add(easter, -2)),
    fmt(add(easter, 1)),
    fmt(new Date(year, 4, 1)),
    fmt(add(easter, 39)),
    fmt(add(easter, 50)),
    fmt(add(easter, 60)),
    fmt(new Date(year, 9, 3)),
    fmt(new Date(year, 10, 1)),
    fmt(new Date(year, 11, 25)),
    fmt(new Date(year, 11, 26)),
  ])
}

const NRW_HOLIDAYS = getNRWHolidays(new Date().getFullYear())

function isNonWorkingDay(d: Date): boolean {
  return isWeekend(d) || NRW_HOLIDAYS.has(d.toISOString().split('T')[0])
}

export default function TeamOverview() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [teamRemaining, setTeamRemaining] = useState<TeamRemaining[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    api.get<VacationRequest[]>('/vacations/all').then((r) => setRequests(r.data))
    api.get<TeamRemaining[]>('/vacations/team/remaining').then((r) => setTeamRemaining(r.data))
  }, [])

  const month = MONTHS[selectedMonth]
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const relevantInMonth = requests.filter(
    (r) =>
      (r.status === 'approved' || r.status === 'pending') &&
      parseISO(r.end_date) >= monthStart &&
      parseISO(r.start_date) <= monthEnd,
  )

  const allMembers = teamRemaining.map((t) => t.employee)

  const dayMap = useMemo(() => {
    const map = new Map<string, { approved: string[]; pending: string[] }>()
    for (const day of allDays) {
      if (isNonWorkingDay(day)) continue
      const key = day.toISOString().split('T')[0]
      const approved: string[] = []
      const pending: string[] = []
      for (const r of relevantInMonth) {
        const s = parseISO(r.start_date)
        const e = parseISO(r.end_date)
        if (day >= s && day <= e) {
          if (r.status === 'approved') approved.push(r.employee.full_name)
          else pending.push(r.employee.full_name)
        }
      }
      map.set(key, { approved, pending })
    }
    return map
  }, [relevantInMonth, allDays])

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await api.get('/export/vacations.csv', {
        params: { year: new Date().getFullYear() },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `urlaub_${new Date().getFullYear()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Teamübersicht</h1>
          <p className="text-brand-gray mt-1">Urlaubskalender und Resttage des gesamten Teams</p>
        </div>
        <button onClick={handleExport} disabled={exportLoading} className="btn-secondary">
          {exportLoading ? 'Exportiert …' : 'CSV exportieren'}
        </button>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap gap-2">
        {MONTHS.map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedMonth(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === i
                ? 'bg-brand-dark text-white'
                : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-dark'
            }`}
          >
            {format(m, 'MMM', { locale: de })}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="card overflow-x-auto p-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold">
            {format(month, 'MMMM yyyy', { locale: de })}
          </h2>
        </div>
        <table className="w-full text-xs" style={{ minWidth: '700px' }}>
          <thead>
            <tr>
              <th className="text-left px-4 py-2 text-brand-gray font-semibold w-28 sticky left-0 bg-gray-50">
                Mitarbeiter
              </th>
              {allDays.map((d) => {
                const key = d.toISOString().split('T')[0]
                const nonWorking = isNonWorkingDay(d)
                const entry = dayMap.get(key)
                const count = nonWorking ? 0 : (entry?.approved.length ?? 0) + (entry?.pending.length ?? 0)
                return (
                  <th
                    key={key}
                    className={`px-0.5 py-2 text-center font-medium min-w-[22px] ${
                      nonWorking
                        ? 'bg-gray-100 text-gray-300'
                        : count > 1
                          ? 'text-red-500 bg-gray-50'
                          : 'text-brand-gray bg-gray-50'
                    }`}
                  >
                    {format(d, 'd')}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allMembers.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-brand-dark sticky left-0 bg-white whitespace-nowrap">
                  {emp.full_name.split(' ')[0]}
                </td>
                {allDays.map((d) => {
                  const key = d.toISOString().split('T')[0]
                  const nonWorking = isNonWorkingDay(d)

                  if (nonWorking) {
                    return <td key={key} className="px-0.5 py-2 bg-gray-100" />
                  }

                  const entry = dayMap.get(key)
                  const isApproved = entry?.approved.includes(emp.full_name) ?? false
                  const isPending = entry?.pending.includes(emp.full_name) ?? false
                  const totalOnDay = (entry?.approved.length ?? 0) + (entry?.pending.length ?? 0)
                  const overlap = totalOnDay > 1

                  let background: string | undefined
                  let tooltip: string | undefined
                  if (isApproved) {
                    background = overlap
                      ? 'linear-gradient(135deg, #00A79D 50%, #ef4444 50%)'
                      : '#00A79D'
                    tooltip = overlap ? 'Genehmigt (Überschneidung!)' : 'Urlaub (genehmigt)'
                  } else if (isPending) {
                    background = overlap
                      ? 'linear-gradient(135deg, #FBB040 50%, #ef4444 50%)'
                      : '#FBB040'
                    tooltip = overlap ? 'Beantragt (Überschneidung!)' : 'Urlaub (beantragt)'
                  }

                  return (
                    <td key={key} className="px-0.5 py-2 text-center">
                      {background && (
                        <span
                          className="block w-4 h-4 rounded mx-auto"
                          style={{ background }}
                          title={tooltip}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Overlap row */}
            <tr className="bg-gray-50">
              <td className="px-4 py-2 text-xs font-semibold text-brand-gray sticky left-0 bg-gray-50">
                Überschneidung
              </td>
              {allDays.map((d) => {
                const key = d.toISOString().split('T')[0]
                const nonWorking = isNonWorkingDay(d)
                if (nonWorking) return <td key={key} className="bg-gray-100" />
                const entry = dayMap.get(key)
                const count = (entry?.approved.length ?? 0) + (entry?.pending.length ?? 0)
                return (
                  <td key={key} className="px-0.5 py-2 text-center">
                    {count > 1 && <span className="text-red-500 font-bold">{count}</span>}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
        <div className="p-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-brand-gray">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand-teal inline-block" /> Genehmigt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#FBB040' }} /> Beantragt
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded inline-block" style={{ background: 'linear-gradient(135deg, #00A79D 50%, #ef4444 50%)' }} /> Überschneidung
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Wochenende / Feiertag
          </span>
        </div>
      </div>

      {/* Team remaining days */}
      {teamRemaining.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold mb-4">Resttage je Mitarbeiter</h2>
          <div className="space-y-3">
            {teamRemaining.map((t) => {
              const pct = Math.round((t.used_days / t.total_days) * 100)
              return (
                <div key={t.employee.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{t.employee.full_name}</span>
                    <span className="text-brand-gray">
                      {t.remaining_days} verbleibend · {t.used_days} genommen
                      {t.pending_days > 0 && ` · ${t.pending_days} beantragt`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct > 80 ? '#ef4444' : '#2B2931',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
