'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { createClient, US_STATES } from '@/lib/supabase'

const DAYS_IN_JULY = 31

interface DayBar {
  day: number
  count: number
}

interface ProfileSummary {
  total: number
  bestDay: number
  daysLogged: number
}

// Aggregate a user's July 2026 push-up logs into one bar per calendar day.
// pushup_logs is world-readable (RLS: "Users can view all logs"), so this runs
// with the anon key from any visitor.
function useUserDailyPushups(userId: string | null) {
  const [data, setData] = useState<DayBar[]>([])
  const [summary, setSummary] = useState<ProfileSummary>({ total: 0, bestDay: 0, daysLogged: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    setLoading(true)
    setError(false)

    const load = async () => {
      try {
        const supabase = createClient()
        const { data: logs, error: logsError } = await supabase
          .from('pushup_logs')
          .select('count, logged_at')
          .eq('user_id', userId)
          .gte('logged_at', '2026-07-01')
          .lte('logged_at', '2026-07-31T23:59:59')

        if (cancelled) return

        if (logsError) {
          setError(true)
          setLoading(false)
          return
        }

        // Seed every day so the axis always spans the full month.
        const totals: number[] = Array(DAYS_IN_JULY + 1).fill(0)
        logs?.forEach((log: { count: number; logged_at: string }) => {
          const day = new Date(log.logged_at).getDate()
          if (day >= 1 && day <= DAYS_IN_JULY) {
            totals[day] += log.count
          }
        })

        const bars: DayBar[] = []
        let total = 0
        let bestDay = 0
        let daysLogged = 0
        for (let day = 1; day <= DAYS_IN_JULY; day++) {
          const count = totals[day]
          bars.push({ day, count })
          total += count
          if (count > bestDay) bestDay = count
          if (count > 0) daysLogged += 1
        }

        setData(bars)
        setSummary({ total, bestDay, daysLogged })
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return { data, summary, loading, error }
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { day, count } = payload[0].payload as DayBar
  return (
    <div className="bg-liberty-dark border border-white/20 px-3 py-2 text-sm">
      <div className="text-white/60">July {day}</div>
      <div className="font-bebas text-xl text-white leading-tight">
        {count.toLocaleString()} <span className="text-white/50 text-sm">push-ups</span>
      </div>
    </div>
  )
}

interface ChartModalProps {
  userId: string
  displayName: string
  stateCode?: string | null
  onClose: () => void
}

function ChartModal({ userId, displayName, stateCode, onClose }: ChartModalProps) {
  const { data, summary, loading, error } = useUserDailyPushups(userId)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (!mounted) return null

  const stateName = stateCode ? US_STATES[stateCode] : null
  const hasReps = summary.total > 0

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={`${displayName} — push-ups per day`}
          className="card w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-t-2xl sm:rounded-none"
          initial={{ y: '100%', opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grab handle (mobile affordance) */}
          <div className="sm:hidden mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />

          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="min-w-0">
              <div className="app-eyebrow mb-2">Push-ups per day</div>
              <h2 className="app-title text-4xl sm:text-5xl leading-none truncate">{displayName}</h2>
              {stateName && <p className="text-white/50 text-sm mt-1">{stateName}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-9 h-9 flex items-center justify-center border border-white/20 text-white/70 hover:bg-white hover:text-liberty-dark transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="h-[280px] flex items-center justify-center text-white/50">
              Loading…
            </div>
          ) : error ? (
            <div className="h-[280px] flex items-center justify-center text-white/50 text-center px-4">
              Couldn&apos;t load this patriot&apos;s reps. Try again in a moment.
            </div>
          ) : !hasReps ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center px-4">
              <div className="font-bebas text-3xl text-liberty-red mb-1">No reps logged yet.</div>
              <p className="text-white/60">Nothing on the board for July so far.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 bg-white/[0.04] border border-white/10 text-center">
                  <div className="font-bebas text-2xl sm:text-3xl text-liberty-red">
                    {summary.total.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide">Total</div>
                </div>
                <div className="p-3 bg-white/[0.04] border border-white/10 text-center">
                  <div className="font-bebas text-2xl sm:text-3xl text-white">
                    {summary.bestDay.toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide">Best day</div>
                </div>
                <div className="p-3 bg-white/[0.04] border border-white/10 text-center">
                  <div className="font-bebas text-2xl sm:text-3xl text-white">{summary.daysLogged}</div>
                  <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wide">Days</div>
                </div>
              </div>

              <div className="h-[260px] sm:h-[320px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barCategoryGap="18%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#555"
                      tick={{ fill: '#999', fontSize: 11 }}
                      interval={3}
                      tickLine={false}
                      label={{ value: 'July', position: 'insideBottom', offset: -2, fill: '#666', fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#555"
                      tick={{ fill: '#999', fontSize: 11 }}
                      width={38}
                      allowDecimals={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                      content={<ChartTooltip />}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={26}>
                      {data.map((d) => (
                        <Cell
                          key={d.day}
                          fill={d.count > 0 ? 'var(--liberty-red)' : 'transparent'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-white/40 text-xs mt-3">
                Push-ups logged each day in July 2026.
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

interface ClickableNameProps {
  userId: string | null | undefined
  displayName: string | null | undefined
  stateCode?: string | null
  className?: string
  fallback?: string
}

// Renders a user's name as a button that opens their push-ups-per-day chart.
// Falls back to plain text when there's no user id to look up.
export default function ClickableName({
  userId,
  displayName,
  stateCode,
  className = '',
  fallback = 'Anonymous',
}: ClickableNameProps) {
  const [open, setOpen] = useState(false)
  const name = displayName || fallback

  if (!userId) {
    return <span className={className}>{name}</span>
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className={`text-left hover:text-liberty-gold hover:underline underline-offset-2 decoration-liberty-gold/60 transition-colors cursor-pointer ${className}`}
        title={`See ${name}'s push-ups per day`}
      >
        {name}
      </button>
      {open && (
        <ChartModal
          userId={userId}
          displayName={name}
          stateCode={stateCode}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
