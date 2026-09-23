'use client'

// Logging a set and clearing a day, with the feedback around them: the
// success and error notes, milestone facts, and the fireworks.
import { useState } from 'react'
import { track } from '@vercel/analytics'
import { nativeRepLoggedFeedback } from '@/lib/native-auth'
import { AMERICAN_FACTS, type UserStats } from '@/lib/supabase'
import { isSeasonDay, seasonForLogging, type Season } from '@/lib/seasons'
import { clearPushupsForDay, logPushups } from '@/lib/pushups'
import type { useDashboardData } from './useDashboardData'

export type FireworksShow = 'fourth' | 'liberty'

type DashboardData = ReturnType<typeof useDashboardData>

export function useRepLogger(
  data: Pick<DashboardData, 'supabase' | 'user' | 'stats' | 'refreshStats' | 'dailyLogs' | 'addToDay' | 'clearDay'>,
  displaySeason: Season,
  logDate: string,
) {
  const { supabase, user, stats, refreshStats, dailyLogs, addToDay, clearDay } = data
  const [pushupCount, setPushupCount] = useState('')
  const [logging, setLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fact, setFact] = useState<string | null>(null)
  const [fireworksShow, setFireworksShow] = useState<FireworksShow | null>(null)

  const flashError = (message: string, ms: number) => {
    setError(message)
    setTimeout(() => setError(null), ms)
  }

  const flashSuccess = (ms: number) => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), ms)
  }

  const log = async () => {
    const count = parseInt(pushupCount)
    if (!count || count < 1 || !user) return

    const season = seasonForLogging()
    if (!isSeasonDay(logDate, season)) {
      flashError('🇺🇸 The Liberty Lift challenge is for the month of July only!', 4000)
      return
    }

    setLogging(true)

    // The RPC stamps the timestamp, enforces the daily cap and rejects a day
    // outside the season. The client no longer decides any of it.
    const { error: logError } = await logPushups(supabase, { count, day: logDate })

    if (logError) {
      console.error('Error logging pushups:', logError)
      flashError(`Error: ${logError.message}`, 4000)
      setLogging(false)
      return
    }

    const oldTotal = stats?.total_pushups || 0
    const newStats: UserStats | null = await refreshStats()
    const newTotal = newStats?.total_pushups || 0

    const milestone = AMERICAN_FACTS.find(f => f.threshold > oldTotal && f.threshold <= newTotal)
    if (milestone) setFact(milestone.fact)

    addToDay(logDate, count)

    track('pushups_logged', { count })
    void nativeRepLoggedFeedback()

    // Crossing the season goal gets the full fireworks show; it outranks the
    // Independence Day easter egg for reps logged on July 4th.
    if (oldTotal < displaySeason.goal && newTotal >= displaySeason.goal) {
      setFireworksShow('liberty')
      track('liberty_achieved_fireworks')
      // Finishing the challenge unlocks the merch shop; the CTA to order
      // waits for the fireworks to finish (see Fireworks onDone).
    } else if (logDate === `${season.year}-07-04`) {
      setFireworksShow('fourth')
      track('july_4th_fireworks')
    }

    setPushupCount('')
    flashSuccess(8000)
    setLogging(false)
  }

  const clearSelectedDay = async () => {
    if (!user || !logDate) return

    const count = dailyLogs?.[logDate] || 0
    if (count === 0) {
      flashError('No push-ups logged for this day', 3000)
      return
    }

    if (!confirm(`Clear all ${count} push-ups for ${logDate}?`)) return

    // Clearing a day is the same rule set as logging one, so it runs through
    // the database too.
    const { error: clearError } = await clearPushupsForDay(supabase, logDate)
    if (clearError) {
      flashError(`Error: ${clearError.message}`, 4000)
      return
    }

    clearDay(logDate)
    await refreshStats()
    flashSuccess(3000)
  }

  return {
    pushupCount,
    setPushupCount,
    logging,
    showSuccess,
    error,
    fact,
    dismissFact: () => setFact(null),
    fireworksShow,
    endFireworks: () => setFireworksShow(null),
    log,
    clearSelectedDay,
  }
}
