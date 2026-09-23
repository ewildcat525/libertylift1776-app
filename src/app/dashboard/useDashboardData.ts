'use client'

// Everything the dashboard reads for the signed-in patriot: the auth user,
// their profile (finishing onboarding on first load), this season's stats,
// daily totals for the calendar and chart, recruits, and — once the books are
// closed — their final standing.
import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { track } from '@vercel/analytics'
import { createClient, isValidStateCode, type Profile, type TablesUpdate, type UserStats } from '@/lib/supabase'
import { clearPendingSignup, generateDisplayName, readPendingSignup } from '@/lib/onboarding'
import { localDateString, type ChallengePhase } from '@/lib/dates'
import { clearReferral } from '@/lib/referral'
import type { Season } from '@/lib/seasons'

type Supabase = ReturnType<typeof createClient>

// Load the profile, creating it for accounts that predate the signup
// trigger, then apply whatever the signup form and share link left behind.
async function loadProfile(supabase: Supabase, user: User): Promise<Profile | null> {
  let { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code === 'PGRST116') {
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id, email: user.email })
      .select()
      .single()
    if (!insertError) {
      profileData = newProfile
    } else {
      console.error('Failed to create profile:', insertError)
    }
  }

  const pendingSignup = readPendingSignup()
  if (profileData) {
    const profileUpdates: TablesUpdate<'profiles'> = {}

    if (!profileData.display_name) {
      profileUpdates.display_name = pendingSignup?.displayName || generateDisplayName(profileData.state_code || undefined)
    }

    if (!profileData.state_code && pendingSignup && isValidStateCode(pendingSignup.stateCode)) {
      profileUpdates.state_code = pendingSignup.stateCode
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select()
        .single()

      if (!updateError && updatedProfile) {
        profileData = updatedProfile
      } else if (updateError) {
        console.error('Failed to update onboarding profile:', updateError)
      }
    }
  }

  // Credit the recruiter once, on first dashboard load after signup.
  if (profileData && !profileData.referred_by && pendingSignup?.referredBy) {
    const { data: referrerId } = await supabase.rpc('resolve_handle', {
      p_handle: pendingSignup.referredBy,
    })
    const referrer = referrerId && referrerId !== user.id ? { id: referrerId } : null

    if (referrer) {
      const { data: referredProfile, error: referralError } = await supabase
        .from('profiles')
        .update({ referred_by: referrer.id })
        .eq('id', user.id)
        .select()
        .single()
      if (!referralError && referredProfile) {
        profileData = referredProfile
        track('referral_attributed')
      } else if (referralError) {
        console.error('Failed to record referral:', referralError)
      }
    }
  }

  if (pendingSignup) {
    clearPendingSignup()
    clearReferral()
  }

  return profileData
}

export function useDashboardData(season: Season, phase: ChallengePhase | null) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  // Null until loaded, so the chart waits for real data.
  const [dailyLogs, setDailyLogs] = useState<Record<string, number> | null>(null)
  const [recruitCount, setRecruitCount] = useState(0)
  const [finalRank, setFinalRank] = useState<number | null>(null)
  const [boardSize, setBoardSize] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setProfile(await loadProfile(supabase, user))

      // Recruits: people who signed up from this user's share links.
      const { data: recruits } = await supabase.rpc('get_recruit_count')
      setRecruitCount(recruits || 0)

      // user_stats is a view over this season's stats with a zeroed row for
      // every profile, so there is never a missing row to create.
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setStats(statsData)

      // Daily totals for the calendar and chart, on the local calendar.
      const { data: logsData } = await supabase
        .from('pushup_logs')
        .select('logged_at, count')
        .eq('user_id', user.id)
        .eq('season_year', season.year)

      if (logsData) {
        const grouped: Record<string, number> = {}
        logsData.forEach(log => {
          const date = localDateString(new Date(log.logged_at))
          grouped[date] = (grouped[date] || 0) + log.count
        })
        setDailyLogs(grouped)
      }
    }

    loadData()
  }, [router, supabase, season.year])

  // Final standing for the after-action report, once the books are closed.
  useEffect(() => {
    if (phase !== 'ended' || !user) return
    supabase
      .from('leaderboard')
      .select('global_rank')
      .eq('id', user.id)
      .limit(1)
      .then(({ data }) => setFinalRank(data?.[0]?.global_rank ?? null))
    supabase
      .from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setBoardSize(count ?? null))
  }, [phase, user, supabase])

  const refreshStats = useCallback(async () => {
    if (!user) return null
    const { data: newStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setStats(newStats)
    return newStats
  }, [supabase, user])

  // Keep the local daily totals in step with a log or a cleared day.
  const addToDay = useCallback((day: string, count: number) => {
    setDailyLogs(prev => ({ ...(prev ?? {}), [day]: (prev?.[day] || 0) + count }))
  }, [])

  const clearDay = useCallback((day: string) => {
    setDailyLogs(prev => {
      const updated = { ...(prev ?? {}) }
      delete updated[day]
      return updated
    })
  }, [])

  return {
    supabase,
    user,
    profile,
    setProfile,
    stats,
    refreshStats,
    dailyLogs,
    addToDay,
    clearDay,
    recruitCount,
    finalRank,
    boardSize,
  }
}
