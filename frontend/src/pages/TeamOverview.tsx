import { useEffect, useState, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '@/api/client'
import type { TeamRemaining, VacationRequest } from '@/types'
import {
  format, eachDayOfInterval, parseISO, isWeekend,
  startOfMonth, endOfMonth, eachMonthOfInterval,
  startOfYear, endOfYear,
} from 'date-fns'
import { de } from 'date-fns/locale'

const MONTHS = eachMonthOfInterval({ start: startOfYear(new Date()), end: endOfYear(new Date()) })
const TODAY = new Date().toISOString().split('T')[0]

function getEasterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1)
}

function getNRWHolidays(year: number): Set<string> {
  const easter = getEasterDate(year)
  const add = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return new Set([
    fmt(new Date(year, 0, 1)), fmt(add(easter, -2)), fmt(add(easter, 1)),
    fmt(new Date(year, 4, 1)), fmt(add(easter, 39)), fmt(add(easter, 50)),
    fmt(add(easter, 60)), fmt(new Date(year, 9, 3)), fmt(new Date(year, 10, 1)),
    fmt(new Date(year, 11, 25)), fmt(new Date(year, 11, 26)),
  ])
}

const NRW_HOLIDAYS = getNRWHolidays(new Date().getFullYear())
const isNonWorkingDay = (d: Date) => isWeekend(d) || NRW_HOLIDAYS.has(d.toISOString().split('T')[0])

type TooltipInfo = { name: string; status: string; x: number; y: number } | null

export default function TeamOverview() {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [teamRemaining, setTeamRemaining] = useState<TeamRemaining[]>([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [direction, setDirection] = useState(0)
  const [exportLoading, setExportLoading] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipInfo>(null)
  const prevMonth = useRef(selectedMonth)

  useEffect(() => {
    api.get<VacationRequest[]>('/vacations/all').then((r) => setRequests(r.data))
    api.get<TeamRemaining[]>('/vacations/team/remaining').then((r) => setTeamRemaining(r.data))
  }, [])

  const changeMonth = (i: number) => {
    if (i < 0 || i > 11) return
    setDirection(i > prevMonth.current ? 1 : -1)
    prevMonth.current = i
    setSelectedMonth(i)
  }

  const month = MONTHS[selectedMonth]
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const allMembers = teamRemaining.map((t) => t.employee)

  const relevantInMonth = requests.filter(
    (r) =>
      (r.status === 'approved' || r.status === 'pending') &&
      parseISO(r.end_date) >= monthStart &&
      parseISO(r.start_date) <= monthEnd,
  )

  const dayMap = useMemo(() => {
    const map = new Map<string, { approved: string[]; pending: string[] }>()
    for (const day of allDays) {
      if (isNonWorkingDay(day)) continue
      const key = day.toISOString().split('T')[0]
      const approved: string[] = [], pending: string[] = []
      for (const r of relevantInMonth) {
        const s = parseISO(r.start_date), e = parseISO(r.end_date)
        if (day >= s && day <= e) {
          if (r.status === 'approved') approved.push(r.employee.full_name)
          else pending.push(r.employee.full_name)
        }
      }
      map.set(key, { approved, pending })
    }
    return map
  }, [relevantInMonth, selectedMonth])

  const ribbonMap = useMemo(() => {
    const result = new Map<number, Map<string, { color: string; isStart: boolean; isEnd: boolean; status: string }>>()
    for (const member of allMembers) {
      const dayData = new Map<string, { color: string; isStart: boolean; isEnd: boolean; status: string }>()
      const memberReqs = relevantInMonth.filter((r) => r.employee.id === member.id)
      for (const req of memberReqs) {
        const s = parseISO(req.start_date), e = parseISO(req.end_date)
        const workDays = allDays.filter((d) => !isNonWorkingDay(d) && d >= s && d <= e)
        workDays.forEach((d, i) => {
          const key = d.toISOString().split('T')[0]
          const entry = dayMap.get(key)
          const overlap = ((entry?.approved.length ?? 0) + (entry?.pending.length ?? 0)) > 1
          let color = req.status === 'approved'
            ? (overlap ? 'linear-gradient(135deg, #00A79D 50%, #ef4444 50%)' : '#00A79D')
            : (overlap ? 'linear-gradient(135deg, #FBB040 50%, #ef4444 50%)' : '#FBB040')
          dayData.set(key, { color, isStart: i === 0, isEnd: i === workDays.length - 1, status: req.status })
        })
      }
      result.set(member.id, dayData)
    }
    return result
  }, [allMembers, relevantInMonth, selectedMonth])

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await api.get('/export/vacations.csv', { params: { year: new Date().getFullYear() }, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a'); a.href = url
      a.download = `urlaub_${new Date().getFullYear()}.csv`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ } finally { setExportLoading(false) }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Teamübersicht</h1>
          <p className="text-brand-gray mt-1">Urlaubskalender und Resttage des gesamten Teams</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleExport} disabled={exportLoading} className="btn-secondary">
          {exportLoading ? 'Exportiert …' : 'CSV exportieren'}
        </motion.button>
      </motion.div>

      {/* Glassmorphism month selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-1.5 flex flex-wrap gap-1"
        style={{
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
        {MONTHS.map((m, i) => (
          <motion.button key={i} onClick={() => changeMonth(i)} whileTap={{ scale: 0.93 }}
            className="relative px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: selectedMonth === i ? '#fff' : '#6b7280' }}>
            {selectedMonth === i && (
              <motion.span layoutId="glass-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #2B2931 0%, #3d3a45 100%)',
                  boxShadow: '0 4px 12px rgba(43,41,49,0.35)',
                }}
                transition={{ type: 'spring', damping: 28, stiffness: 400 }} />
            )}
            <span className="relative z-10">{format(m, 'MMM', { locale: de })}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Calendar */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)' }}>

        {/* Month title bar */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #2B2931 0%, #3a3740 100%)', borderBottom: '3px solid #FBB040' }}>
          <AnimatePresence mode="wait">
            <motion.h2 key={selectedMonth}
              initial={{ opacity: 0, y: direction > 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -10 : 10 }}
              transition={{ duration: 0.2 }}
              className="font-heading font-bold text-white text-lg">
              {format(month, 'MMMM yyyy', { locale: de })}
            </motion.h2>
          </AnimatePresence>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#FBB040' }} /> Beantragt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#00A79D' }} /> Genehmigt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'linear-gradient(135deg, #00A79D 50%, #ef4444 50%)' }} /> Überschneidung
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{
                background: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 1.5px, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 50%)',
                backgroundSize: '5px 5px',
                border: '1px solid rgba(255,255,255,0.25)',
              }} /> Wochenende/Feiertag
            </span>
          </div>
        </div>

        <div className="bg-white overflow-x-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={selectedMonth}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <table className="w-full text-xs" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <th className="text-left px-4 py-2 sticky left-0 bg-gray-50"
                      style={{ width: '120px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', fontSize: '11px', textTransform: 'uppercase' }}>
                      Mitarbeiter
                    </th>
                    {allDays.map((d) => {
                      const key = d.toISOString().split('T')[0]
                      const nonWorking = isNonWorkingDay(d)
                      const isToday = key === TODAY
                      return (
                        <th key={key} style={{
                          minWidth: '22px', padding: '6px 1px', textAlign: 'center', fontWeight: 600,
                          color: isToday ? '#00A79D' : nonWorking ? '#bbb' : '#9ca3af',
                          background: isToday ? '#f0fdfb' : nonWorking ? 'repeating-linear-gradient(-45deg, #d8d8d8 0, #d8d8d8 1.5px, #efefef 0, #efefef 50%)' : 'transparent',
                          backgroundSize: nonWorking ? '5px 5px' : undefined,
                          position: 'relative',
                        }}>
                          {isToday && (
                            <motion.div className="absolute inset-0"
                              style={{ background: 'linear-gradient(180deg, rgba(0,167,157,0.1) 0%, rgba(0,167,157,0.04) 100%)' }}
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
                          )}
                          <span className="relative z-10">{format(d, 'd')}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((emp, empIdx) => {
                    const empRibbon = ribbonMap.get(emp.id)
                    return (
                      <motion.tr key={emp.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: empIdx * 0.05, type: 'spring', damping: 22, stiffness: 300 }}
                        className="group"
                        style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td className="px-3 py-0 sticky left-0 bg-white"
                          style={{ height: '36px', borderRight: '1px solid #f3f4f6' }}>
                          <span className="font-medium text-brand-dark whitespace-nowrap text-xs">
                            {emp.full_name.split(' ')[0]}
                          </span>
                        </td>
                        {allDays.map((d) => {
                          const key = d.toISOString().split('T')[0]
                          const nonWorking = isNonWorkingDay(d)
                          const isToday = key === TODAY
                          const cell = empRibbon?.get(key)

                          return (
                            <td key={key} style={{
                              padding: 0, height: '36px',
                              background: isToday ? '#f0fdfb' : nonWorking ? 'repeating-linear-gradient(-45deg, #d8d8d8 0, #d8d8d8 1.5px, #efefef 0, #efefef 50%)' : 'white',
                              backgroundSize: nonWorking ? '5px 5px' : undefined,
                              position: 'relative',
                            }}
                              onMouseEnter={(e) => {
                                if (cell) setTooltip({
                                  name: emp.full_name,
                                  status: cell.status,
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }}
                              onMouseLeave={() => setTooltip(null)}>
                              {cell && (() => {
                                const isGrad = cell.color.startsWith('linear-gradient')
                                const bg = isGrad ? cell.color : cell.color
                                const shadow = isGrad ? 'none' : (cell.isStart ? `2px 0 8px ${cell.color}40` : 'none')
                                return (
                                <motion.div
                                  style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '12px', height: '12px',
                                    background: bg,
                                    borderRadius: '3px',
                                    boxShadow: shadow,
                                  }}
                                  initial={{ clipPath: 'inset(0 100% 0 0 round 4px)' }}
                                  animate={{ clipPath: 'inset(0 0% 0 0 round 4px)' }}
                                  transition={{ duration: 0.55, delay: empIdx * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
                                />
                                )
                              })()}
                            </td>
                          )
                        })}
                      </motion.tr>
                    )
                  })}

                  {/* Overlap row */}
                  <tr style={{ background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
                    <td className="px-4 py-2 sticky left-0 text-xs font-semibold"
                      style={{ background: '#fafafa', color: '#9ca3af', borderRight: '1px solid #f3f4f6' }}>
                      Überschneidung
                    </td>
                    {allDays.map((d) => {
                      const key = d.toISOString().split('T')[0]
                      const nonWorking = isNonWorkingDay(d)
                      if (nonWorking) return <td key={key} style={{ background: '#fafafa' }} />
                      const entry = dayMap.get(key)
                      const count = (entry?.approved.length ?? 0) + (entry?.pending.length ?? 0)
                      return (
                        <td key={key} className="text-center py-2">
                          {count > 1 && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-bold"
                              style={{ background: '#ef4444', fontSize: '10px',
                                boxShadow: '0 2px 6px rgba(239,68,68,0.4)' }}>
                              {count}
                            </motion.span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Floating tooltip */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 4 }}
            transition={{ type: 'spring', damping: 22, stiffness: 400 }}
            className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs font-medium text-white"
            style={{
              left: tooltip.x + 12, top: tooltip.y - 36,
              background: 'linear-gradient(135deg, #2B2931 0%, #3a3740 100%)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
            {tooltip.name} · {tooltip.status === 'approved' ? 'Genehmigt' : 'Beantragt'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resttage */}
      {teamRemaining.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }} className="card">
          <h2 className="font-heading font-semibold mb-4">Resttage je Mitarbeiter</h2>
          <div className="space-y-4">
            {teamRemaining.map((t, idx) => {
              const pct = Math.round((t.used_days / t.total_days) * 100)
              const pendingPct = Math.round((t.pending_days / t.total_days) * 100)
              return (
                <motion.div key={t.employee.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.18 + idx * 0.06, type: 'spring', damping: 22, stiffness: 280 }}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">{t.employee.full_name}</span>
                    <span className="text-brand-gray text-xs">
                      {t.remaining_days} verbleibend · {t.used_days} genommen
                      {t.pending_days > 0 && ` · ${t.pending_days} beantragt`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <motion.div className="h-full"
                      style={{ backgroundColor: pct > 80 ? '#ef4444' : '#00A79D' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.85, delay: 0.25 + idx * 0.06, ease: [0.34, 1.56, 0.64, 1] }} />
                    <motion.div className="h-full" style={{ backgroundColor: '#FBB040' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pendingPct}%` }}
                      transition={{ duration: 0.85, delay: 0.35 + idx * 0.06, ease: [0.34, 1.56, 0.64, 1] }} />
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
