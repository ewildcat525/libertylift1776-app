import type { Metadata } from 'next'
import Link from 'next/link'
import { fetchProfileStatsByHandle, fetchPublicProfileByHandle, isFoundingFather } from '@/lib/public-data'
import { US_STATES } from '@/lib/supabase'

export const revalidate = 60

interface PageProps {
  params: { handle: string }
}

function decodeHandle(handle: string) {
  try {
    return decodeURIComponent(handle)
  } catch {
    return handle
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const handle = decodeHandle(params.handle)
  const stats = await fetchProfileStatsByHandle(handle)
  const fallback = stats ? null : await fetchPublicProfileByHandle(handle)

  if (!stats && !fallback) {
    return {
      title: 'Liberty Lift 1776 — The Push-Up Challenge',
      description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
    }
  }

  const name = stats?.display_name || fallback?.display_name || 'A patriot'
  const title = `${name} — Liberty Lift 1776`
  const description = stats
    ? `${name} has logged ${stats.total_pushups.toLocaleString()} of 1,776 push-ups (#${stats.global_rank} nationally). Think you can keep up?`
    : `${name} joined the 1776 push-up challenge. Think you can keep up?`

  return {
    title,
    description,
    // Page-level openGraph replaces the layout's, so restate the site-wide
    // fields — some unfurlers (e.g. Teams) want og:url/og:type present.
    openGraph: {
      title,
      description,
      url: `/p/${encodeURIComponent(handle)}`,
      type: 'profile',
      siteName: 'Liberty Lift 1776',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const handle = decodeHandle(params.handle)
  const stats = await fetchProfileStatsByHandle(handle)
  const fallback = stats ? null : await fetchPublicProfileByHandle(handle)

  const knownName = stats?.display_name || fallback?.display_name || null
  const name = knownName || handle
  const stateCode = stats?.state_code || fallback?.state_code || null
  const stateName = stateCode ? US_STATES[stateCode] : null
  const total = stats?.total_pushups ?? 0
  const progress = Math.min((total / 1776) * 100, 100)
  const refQuery = knownName ? `?ref=${encodeURIComponent(knownName)}` : ''

  return (
    <main className="auth-page">
      <header className="conversion-nav">
        <Link href="/" className="flex items-center gap-3 campaign-nav-mark">
          <span className="campaign-nav-monogram">LL</span>
          <span className="campaign-nav-name">Liberty Lift / 1776</span>
        </Link>
        <div className="conversion-nav-actions">
          <Link href={`/signup${refQuery}`} className="campaign-nav-cta">
            Join the challenge
          </Link>
        </div>
      </header>

      <section className="auth-shell auth-shell-center">
        <div className="auth-card text-center">
          {stats ? (
            <>
              <div className="app-eyebrow justify-center mb-3">
                {stateName ? `Team ${stateName}` : 'The push-up challenge'}
              </div>
              <h1 className="app-title text-5xl sm:text-6xl mb-2">{name}</h1>
              {isFoundingFather(stats.created_at) && (
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 border border-liberty-gold/50 bg-liberty-gold/10 text-liberty-gold text-xs font-bold uppercase tracking-[0.15em]">
                  ★ Founding Father
                </div>
              )}
              <p className="text-white/60 mb-8">
                {total >= 1776
                  ? 'Completed the 1776 push-up challenge.'
                  : `#${stats.global_rank} on the national board.`}
              </p>

              <div className="font-bebas text-8xl text-white leading-none">
                {total.toLocaleString()}
              </div>
              <div className="text-white/50 uppercase tracking-wider mb-6">
                of 1,776 push-ups
              </div>

              <div className="progress-bar mb-8">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-10">
                <div className="p-4 bg-white/[0.04] border border-white/10">
                  <div className="font-bebas text-3xl text-liberty-red">{stats.current_streak}</div>
                  <div className="text-xs text-white/50 uppercase">Day streak</div>
                </div>
                <div className="p-4 bg-white/[0.04] border border-white/10">
                  <div className="font-bebas text-3xl text-white">{stats.best_day}</div>
                  <div className="text-xs text-white/50 uppercase">Best day</div>
                </div>
                <div className="p-4 bg-white/[0.04] border border-white/10">
                  <div className="font-bebas text-3xl text-white">{stats.days_logged}</div>
                  <div className="text-xs text-white/50 uppercase">Days logged</div>
                </div>
              </div>

              <h2 className="font-bebas text-3xl text-liberty-red mb-3">
                Think you can keep up?
              </h2>
              <p className="text-white/60 mb-6">
                1,776 push-ups in July. Every rep counts for you and your state.
              </p>
            </>
          ) : fallback ? (
            <>
              <div className="app-eyebrow justify-center mb-3">
                {stateName ? `Team ${stateName}` : 'The push-up challenge'}
              </div>
              <h1 className="app-title text-5xl sm:text-6xl mb-2">{name}</h1>
              {isFoundingFather(fallback.created_at) && (
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 border border-liberty-gold/50 bg-liberty-gold/10 text-liberty-gold text-xs font-bold uppercase tracking-[0.15em]">
                  ★ Founding Father
                </div>
              )}
              <p className="text-white/60 mb-8">
                Enlisted for the 1776 push-up challenge. First reps land July 1 —
                will you be on the board with them?
              </p>
            </>
          ) : (
            <>
              <div className="app-eyebrow justify-center mb-3">The push-up challenge</div>
              <h1 className="app-title text-5xl mb-3">1,776 push-ups in July.</h1>
              <p className="text-white/60 mb-8">
                This patriot hasn&apos;t hit the board yet — but you still can.
              </p>
            </>
          )}

          <div className="flex flex-col gap-3">
            <Link href={`/signup${refQuery}`} className="btn-gold w-full py-3 text-center">
              Accept the challenge
            </Link>
            <Link href="/leaderboard" className="btn-secondary w-full py-3 text-center">
              See the national board
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
