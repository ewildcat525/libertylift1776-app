'use client'

// The signed-in patriot's board. Data loading lives in useDashboardData,
// logging in useRepLogger, the iOS sheet in useNativeLogger, and the math in
// lib/progress; this file only lays the sections out.
import { useEffect, useMemo, useState } from 'react'
import { track } from '@vercel/analytics'
import { challengePhase, localDateString, type ChallengePhase } from '@/lib/dates'
import { seasonForDisplay, seasonForLogging } from '@/lib/seasons'
import { buildChartData, paceFor, requiredPerDay as requiredPerDayFor } from '@/lib/progress'
import AccountSettings from '@/components/AccountSettings'
import BadgeCase from '@/components/BadgeCase'
import CommunityMilestoneBanner from '@/components/CommunityMilestoneBanner'
import FinalPushBanner from '@/components/FinalPushBanner'
import Fireworks from '@/components/Fireworks'
import Navigation from '@/components/Navigation'
import PledgeWidget from '@/components/PledgeWidget'
import LogCard from './LogCard'
import MerchUnlockDialog from './MerchUnlockDialog'
import NativeToday from './NativeToday'
import ProfileHeader from './ProfileHeader'
import ProgressChart from './ProgressChart'
import RecruitCard from './RecruitCard'
import SeasonCalendar from './SeasonCalendar'
import StatsCard from './StatsCard'
import StatusCard from './StatusCard'
import { useDashboardData } from './useDashboardData'
import { useNativeLogger } from './useNativeLogger'
import { useRepLogger } from './useRepLogger'

const displaySeason = seasonForDisplay()
const loggingSeason = seasonForLogging()
const NO_LOGS: Record<string, number> = {}

// The day a new log defaults to: today, clamped into the logging season.
function defaultLogDate(): string {
  const today = localDateString()
  if (today < loggingSeason.startsOn) return loggingSeason.startsOn
  if (today > loggingSeason.endsOn) return loggingSeason.endsOn
  return today
}

export default function DashboardPage() {
  // Challenge lifecycle, resolved after mount so the prerendered HTML (which
  // has no clock) matches the first client render.
  const [phase, setPhase] = useState<ChallengePhase | null>(null)
  const [logDate, setLogDate] = useState(defaultLogDate)
  const [showMerchUnlock, setShowMerchUnlock] = useState(false)

  useEffect(() => {
    setPhase(challengePhase())
  }, [])

  const data = useDashboardData(displaySeason, phase)
  const { user, profile, stats } = data
  const logger = useRepLogger(data, displaySeason, logDate)
  const nativeSheet = useNativeLogger()

  const dailyLogs = data.dailyLogs ?? NO_LOGS
  const chartData = useMemo(
    () => (data.dailyLogs ? buildChartData(data.dailyLogs, displaySeason) : []),
    [data.dailyLogs],
  )
  const requiredPerDay = requiredPerDayFor(chartData, displaySeason)
  const pace = paceFor(stats?.total_pushups ?? 0, displaySeason)

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/50">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      {logger.fireworksShow && (
        <Fireworks
          onDone={() => {
            // The archived finisher merch belongs to the 2026 campaign.
            if (logger.fireworksShow === 'liberty' && displaySeason.year === 2026) {
              setShowMerchUnlock(true)
              track('merch_unlock_cta_shown')
            }
            logger.endFireworks()
          }}
          {...(logger.fireworksShow === 'liberty' && {
            title: '🇺🇸 LIBERTY ACHIEVED 🇺🇸',
            subtitle: `${displaySeason.goal.toLocaleString()} push-ups — Founding Father`,
          })}
        />
      )}
      {showMerchUnlock && (
        <MerchUnlockDialog season={displaySeason} onClose={() => setShowMerchUnlock(false)} />
      )}
      <div className="native-dashboard-screen min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="native-dashboard-content max-w-4xl mx-auto">
          <NativeToday
            profile={profile}
            stats={stats}
            dailyLogs={dailyLogs}
            phase={phase}
            season={displaySeason}
            onOpenLogger={() => nativeSheet.setOpen(true)}
          />

          <ProfileHeader
            supabase={data.supabase}
            userId={user.id}
            profile={profile}
            onProfileChange={data.setProfile}
            totalPushups={stats?.total_pushups ?? 0}
            phase={phase}
            season={displaySeason}
          />

          <StatusCard
            phase={phase}
            pace={pace}
            season={displaySeason}
            profile={profile}
            stats={stats}
            requiredPerDay={requiredPerDay}
            finalRank={data.finalRank}
            boardSize={data.boardSize}
          />

          {/* The Final Push: last-day blitz. Keyed to the user's total so the
              day board moves the moment their reps land. */}
          <FinalPushBanner
            userId={user.id}
            refreshKey={stats?.total_pushups ?? 0}
            className="mb-8"
          />

          {/* Hidden once the books are closed; a sheet in the iOS app. */}
          {phase !== 'ended' && (!nativeSheet.nativeMode || nativeSheet.open) && (
            <LogCard
              season={loggingSeason}
              profile={profile}
              stats={stats}
              pushupCount={logger.pushupCount}
              onPushupCountChange={logger.setPushupCount}
              logDate={logDate}
              onLogDateChange={setLogDate}
              logging={logger.logging}
              onLog={logger.log}
              showSuccess={logger.showSuccess}
              error={logger.error}
              fact={logger.fact}
              onDismissFact={logger.dismissFact}
              nativeMode={nativeSheet.nativeMode}
              sheetOpen={nativeSheet.open}
              onCloseSheet={() => nativeSheet.setOpen(false)}
              sheetRef={nativeSheet.sheetRef}
              inputRef={nativeSheet.inputRef}
            />
          )}

          {/* Nationwide count + milestone celebration. Keyed to the user's
              total so it refetches right after a log — if that rep rang the
              bell, the fireworks fire on the spot. */}
          <CommunityMilestoneBanner
            userId={user.id}
            refreshKey={stats?.total_pushups ?? 0}
            className="mb-8"
          />

          <StatsCard stats={stats} season={displaySeason} />

          <div className="web-dashboard-detail"><BadgeCase userId={user.id} stats={stats} /></div>

          {profile?.display_name && (
            <RecruitCard
              handle={profile.display_name}
              stateCode={profile.state_code}
              stats={stats}
              recruitCount={data.recruitCount}
            />
          )}

          <ProgressChart chartData={chartData} requiredPerDay={requiredPerDay} season={displaySeason} />

          <SeasonCalendar
            season={displaySeason}
            dailyLogs={dailyLogs}
            selectedDate={logDate}
            onSelectDate={setLogDate}
            phase={phase}
            onClearDay={logger.clearSelectedDay}
          />

          <div className="web-dashboard-detail">
            <PledgeWidget userId={user.id} totalPushups={stats?.total_pushups || 0} />
          </div>

          <div className="web-dashboard-detail"><AccountSettings /></div>
        </div>
      </div>
    </>
  )
}
