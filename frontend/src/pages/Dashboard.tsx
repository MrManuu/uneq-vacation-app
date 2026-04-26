import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import type { RemainingDays, VacationRequest } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [remaining, setRemaining] = useState<RemainingDays | null>(null)
  const [recent, setRecent] = useState<VacationRequest[]>([])

  useEffect(() => {
    api.get<RemainingDays>('/vacations/remaining').then((r) => setRemaining(r.data))
    api.get<VacationRequest[]>('/vacations/my').then((r) => setRecent(r.data.slice(0, 5)))
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-3xl font-heading font-bold text-brand-dark">
          Willkommen, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="text-brand-gray mt-1">Urlaubsübersicht {new Date().getFullYear()}</p>
      </motion.div>

      {/* Stats */}
      {remaining && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
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
            label="Beantragt"
            value={remaining.pending_days}
            total={remaining.total_days}
            color="#FBB040"
          />
        </motion.div>
      )}

      {/* Progress bar */}
      {remaining && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="card"
        >
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold">Urlaubsverbrauch {remaining.year}</span>
            <span className="text-brand-gray">
              {remaining.used_days} / {remaining.total_days} Tage
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
            <motion.div
              className="h-full"
              style={{ backgroundColor: '#00A79D' }}
              initial={{ width: 0 }}
              animate={{ width: `${(remaining.used_days / remaining.total_days) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            />
            <motion.div
              className="h-full"
              style={{ backgroundColor: '#FBB040' }}
              initial={{ width: 0 }}
              animate={{ width: `${(remaining.pending_days / remaining.total_days) * 100}%` }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-brand-gray">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#00A79D' }} />
              Genommen: {remaining.used_days}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#FBB040' }} />
              Beantragt: {remaining.pending_days}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />
              Frei: {remaining.remaining_days}
            </span>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-wrap gap-3">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link to="/request" className="btn-primary">
            + Urlaub beantragen
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link to="/my-requests" className="btn-secondary">
            Alle Anträge
          </Link>
        </motion.div>
      </motion.div>

      {/* Recent requests */}
      {recent.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="card">
          <h2 className="text-lg font-heading font-semibold mb-4">Letzte Anträge</h2>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="divide-y divide-gray-50"
          >
            {recent.map((r) => (
              <motion.div
                key={r.id}
                variants={fadeUp}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(r.start_date), 'd. MMM', { locale: de })} –{' '}
                    {format(new Date(r.end_date), 'd. MMM yyyy', { locale: de })}
                  </p>
                  <p className="text-xs text-brand-gray mt-0.5">{r.working_days} Arbeitstage</p>
                </div>
                <StatusBadge status={r.status} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
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
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="card flex items-start gap-4 cursor-default"
    >
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <motion.p
          className="text-3xl font-heading font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 18, stiffness: 260, delay: 0.15 }}
        >
          {value}
        </motion.p>
        <p className="text-xs text-brand-gray mt-0.5">{label}</p>
        <p className="text-xs text-brand-gray">von {total} Tagen</p>
      </div>
    </motion.div>
  )
}
