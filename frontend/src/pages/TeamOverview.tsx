import { useEffect, useState, useMemo } from 'react'
import api from '@/api/client'
import type { TeamRemaining, VacationRequest } from '@/types'
import { format, eachDayOfInterval, parseISO, isWeekend, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns'
import { de } from 'date-fns/locale'

const MONTHS = eachMonthOfInterval({
  start: startOfYear(new Date()),
  end: endOfYear(new Date()),
})

export default function TeamOverview() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [teamRemaining, setTeamRemaining] = useState<TeamRemaining[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    api.get<VacationRequest[]>('/vacations/team').then((r) => setRequests(r.data))
    api.get<TeamRemaining[]>('/vacations/team/remaining').then((r) => setTeamRemaining(r.data))
  }, [])

  const month = MONTHS[selectedMonth]
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const workingDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
    (d) => !isWeekend(d),
  )

  // approved requests intersecting the selected month
  const approvedInMonth = requests.filter(
    (r) =>
      r.status === 'approved' &&
      parseISO(r.end_date) >= monthStart &&
      parseISO(r.start_date) <= monthEnd,
  )

  // For each working day, count how many employees are on vacation
  const overlapMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const day of workingDays) {
      const names: string[] = []
      for (const r of approvedInMonth) {
        const s = parseISO(r.start_date)
        const e = parseISO(r.end_date)
        if (day >= s && day <= e) names.push(r.employee.full_name)
      }
      map.set(day.toISOString().split('T')[0], names)
    }
    return map
  }, [approvedInMonth, workingDays])

  const employees = [...new Map(approvedInMonth.map((r) => [r.employee_id, r.employee])).values()]

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
          <p className="text-brand-gray mt-1">Urlaubskalender und Resttage deines Teams</p>
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
        {employees.length === 0 ? (
          <p className="p-6 text-brand-gray text-sm">
            Keine genehmigten Urlaube in diesem Monat.
          </p>
        ) : (
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 text-brand-gray font-semibold w-32 sticky left-0 bg-gray-50">
                  Mitarbeiter
                </th>
                {workingDays.map((d) => {
                  const key = d.toISOString().split('T')[0]
                  const count = overlapMap.get(key)?.length ?? 0
                  return (
                    <th
                      key={key}
                      className={`px-1 py-2 text-center font-medium min-w-[28px] ${
                        count > 1 ? 'text-red-500' : 'text-brand-gray'
                      }`}
                    >
                      {format(d, 'd')}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-brand-dark sticky left-0 bg-white whitespace-nowrap">
                    {emp.full_name.split(' ')[0]}
                  </td>
                  {workingDays.map((d) => {
                    const key = d.toISOString().split('T')[0]
                    const isOff = overlapMap.get(key)?.includes(emp.full_name) ?? false
                    const overlap = (overlapMap.get(key)?.length ?? 0) > 1
                    return (
                      <td key={key} className="px-1 py-2 text-center">
                        {isOff && (
                          <span
                            className="block w-5 h-5 rounded mx-auto"
                            style={{ backgroundColor: overlap ? '#ef4444' : '#00A79D' }}
                            title={overlap ? 'Überschneidung!' : 'Urlaub'}
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
                {workingDays.map((d) => {
                  const key = d.toISOString().split('T')[0]
                  const count = overlapMap.get(key)?.length ?? 0
                  return (
                    <td key={key} className="px-1 py-2 text-center">
                      {count > 1 && (
                        <span className="text-red-500 font-bold">{count}</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        )}
        <div className="p-4 border-t border-gray-100 flex gap-4 text-xs text-brand-gray">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand-teal inline-block" /> Urlaub
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Überschneidung
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
                      {t.pending_days > 0 && ` · ${t.pending_days} ausstehend`}
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
