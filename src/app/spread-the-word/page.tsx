import type { Metadata } from 'next'
import Link from 'next/link'
import CopyBlock from '@/components/CopyBlock'
import Navigation from '@/components/Navigation'
import { siteUrl } from '@/lib/site'
import { catchUpPace, easternNow } from '@/lib/dates'

// Captions quote today's catch-up pace, so re-render at most hourly.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Spread the Word — Liberty Lift 1776',
  description:
    'Ready-made captions, the hashtag, and share links to recruit your state for the 1776 push-up challenge.',
}

function buildCaptions(reps: number, isJulyFourth: boolean) {
  const captions = [
    {
      label: 'The straight challenge',
      text: `1,776 push-ups by July 31. I'm already on the board — join today and it's ${reps} a day. Are you in?\n\n#LibertyLift1776\n${siteUrl}`,
    },
    {
      label: 'Late joiner, zero excuses',
      text: `Think you missed the start of the Liberty Lift 1776 challenge? You didn't. Sign up today, log ${reps} push-ups a day, and you finish all 1,776 right alongside the rest of us.\n\n#LibertyLift1776\n${siteUrl}`,
    },
    {
      label: 'State rivalry',
      text: `My state is on the board for the Liberty Lift 1776 challenge and we are NOT losing to our neighbors. 1,776 push-ups each by July 31 — every recruit counts.\n\nRep your state: ${siteUrl}/states\n#LibertyLift1776`,
    },
    {
      label: 'Call out a friend',
      text: `@friend — 1,776 push-ups by July 31. You vs me, starting today. Loser donates to the winner's charity.\n\n#LibertyLift1776\n${siteUrl}`,
    },
    {
      label: 'Gym / group chat',
      text: `Squad challenge: 1,776 push-ups each by July 31 (${reps} a day if you start today), tracked on a live leaderboard, state vs state. I'm setting up a private contest — reply and I'll send the invite link.\n\n#LibertyLift1776`,
    },
    {
      label: 'Short-form video script',
      text: `Hook: "It's not too late to do 1,776 push-ups this month. Here's the math."\nBeat 1: It's the Liberty Lift 1776 challenge — 1,776 push-ups by July 31, for you AND your state on a national leaderboard.\nBeat 2: Start today and it's ${reps} a day. That's it. Every day you wait, the number climbs.\nBeat 3 (CTA): "Link in bio. Pick your state. Don't let [rival state] win."`,
    },
  ]

  if (isJulyFourth) {
    captions.unshift({
      label: 'The Fourth of July special',
      text: `Signing up for 1,776 push-ups ON the Fourth of July. Peak America. ${reps} a day from today, done by the 31st — and every rep can raise money for Wounded Warrior Project.\n\nWho's in? 🇺🇸\n#LibertyLift1776\n${siteUrl}`,
    })
  }

  return captions
}

export default function SpreadTheWordPage() {
  const now = easternNow()
  const reps = catchUpPace(now) ?? 58
  const isJulyFourth = now.getFullYear() === 2026 && now.getMonth() === 6 && now.getDate() === 4
  const captions = buildCaptions(reps, isJulyFourth)

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Recruiting kit</div>
            <h1 className="app-title text-6xl sm:text-7xl">Spread the word</h1>
            <p className="text-white/60 mt-3 max-w-2xl">
              Copy a caption, post it anywhere, and use the hashtag{' '}
              <span className="text-liberty-gold font-bold">#LibertyLift1776</span>. Share your
              personal page from the dashboard so recruits count toward your total — every state
              page and profile link unfurls with its own scoreboard image. Captions already show
              today&apos;s catch-up pace, so recruits know it&apos;s not too late to join.
            </p>
          </div>

          <div className="grid gap-4 mb-10">
            {captions.map((c) => (
              <CopyBlock key={c.label} label={c.label} text={c.text} />
            ))}
          </div>

          <div className="card p-6 mb-10">
            <h3 className="font-bebas text-xl text-liberty-red mb-3">Links that unfurl with live stats</h3>
            <ul className="text-white/70 text-sm space-y-2">
              <li>
                <span className="text-white/40">Your progress card:</span>{' '}
                share from your <Link href="/dashboard" className="text-liberty-gold hover:underline">dashboard</Link>{' '}
                — recruits via your link count toward your recruiter rank.
              </li>
              <li>
                <span className="text-white/40">State boards:</span>{' '}
                <span className="font-mono">{siteUrl}/states/TX</span> (works for any state code)
              </li>
              <li>
                <span className="text-white/40">Contest invites:</span>{' '}
                create one on the <Link href="/contests" className="text-liberty-gold hover:underline">contests page</Link>{' '}
                and share the invite link.
              </li>
            </ul>
          </div>

          <div className="text-center">
            <Link href="/dashboard" className="btn-gold inline-flex px-8 py-3">
              Share your own board
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
