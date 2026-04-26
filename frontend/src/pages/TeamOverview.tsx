import { useEffect, useState, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
}

export default function TeamOverview() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [teamRemaining, setTeamRemaining] = useState<TeamRemaining[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [direction, setDirection] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)
  const prevMonth = useRef(selectedMonth)

  useEffect(() => {
    api.get<VacationRequest[]>('/vacations/all').then((r) => setRequests(r.data))
    api.get<TeamRemaining[]>('/vacations/team/remaining').then((r) => setTeamRemaining(r.data))
  }, [])

  const handleMonthChange = (i: number) => {
    setDirection(i > prevMonth.current ? 1 : -1)
    prevMonth.current = i
    setSelectedMonth(i)
  }

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
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold">Teamübersicht</h1>
          <p className="text-brand-gray mt-1">Urlaubskalender und Resttage des gesamten Teams</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          disabled={exportLoading}
          className="btn-secondary"
        >
          {exportLoading ? 'Exportiert …' : 'CSV exportieren'}
        </motion.button>
      </motion.div>

      {/* Month selector with layoutId active pill */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.06 }}
        className="flex flex-wrap gap-2"
      >
        {MONTHS.map((m, i) => (
          <motion.button
            key={i}
            onClick={() => handleMonthChange(i)}
            whileTap={{ scale: 0.94 }}
            className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === i
                ? 'text-white'
                : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-dark'
            }`}
          >
            {selectedMonth === i && (
              <motion.span
                layoutId="month-pill"
                className="absolute inset-0 rounded-lg bg-brand-dark"
                transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              />
            )}
            <span className="relative z-10">{format(m, 'MMM', { locale: de })}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Calendar grid with slide transition */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.1 }}
        className="card overflow-hidden p-0"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={selectedMonth}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-heading font-semibold">
                {format(month, 'MMMM yyyy', { locale: de })}
              </h2>
            </div>
            <div className="overflow-x-auto">
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
                    <motion.tr
                      key={emp.id}
                      className="hover:bg-brand-teal/5 transition-colors duration-150"
                      whileHover={{ backgroundColor: 'rgba(0,167,157,0.04)' }}
                    >
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
                              <motion.span
                                className="block w-4 h-4 rounded mx-auto cursor-default"
                                style={{ background }}
                                title={tooltip}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                                whileHover={{ scale: 1.3 }}
                              />
                            )}
                          </td>
                        )
                      })}
                    </motion.tr>
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
                          {count > 1 && (
                            <motion.span
                              className="text-red-500 font-bold"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', damping: 18, stiffness: 400 }}
                            >
                              {count}
                            </motion.span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-brand-gray">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#FBB040' }} /> Beantragt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-teal inline-block" /> Genehmigt
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded inline-block" style={{ background: 'linear-gradient(135deg, #00A79D 50%, #ef4444 50%)' }} /> Überschneidung
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Wochenende / Feiertag
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Team remaining days */}
      {teamRemaining.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.15 }}
          className="card"
        >
          <h2 className="font-heading font-semibold mb-4">Resttage je Mitarbeiter</h2>
          <div className="space-y-4">
            {teamRemaining.map((t, idx) => {
              const pct = Math.round((t.used_days / t.total_days) * 100)
              const pendingPct = Math.round((t.pending_days / t.total_days) * 100)
              return (
                <motion.div
                  key={t.employee.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + idx * 0.06, type: 'spring', damping: 22, stiffness: 280 }}
                >
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{t.employee.full_name}</span>
                    <span className="text-brand-gray">
                      {t.remaining_days} verbleibend · {t.used_days} genommen
                      {t.pending_days > 0 && ` · ${t.pending_days} beantragt`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: pct > 80 ? '#ef4444' : '#00A79D' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.85, delay: 0.25 + idx * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: '#FBB040' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pendingPct}%` }}
                      transition={{ duration: 0.85, delay: 0.35 + idx * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
