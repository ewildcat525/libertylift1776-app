import type { Metadata } from 'next'
import Link from 'next/link'
import CopyBlock from '@/components/CopyBlock'
import Navigation from '@/components/Navigation'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Spread the Word — Liberty Lift 1776',
  description:
    'Ready-made captions, the hashtag, and share links to recruit your state for the 1776 push-up challenge.',
}

const captions = [
  {
    label: 'The straight challenge',
    text: `1,776 push-ups in July. That's 58 a day. I'm in — are you?\n\n#LibertyLift1776\n${siteUrl}`,
  },
  {
    label: 'State rivalry',
    text: `My state is on the board for the Liberty Lift 1776 challenge and we are NOT losing to our neighbors. 1,776 push-ups each, all of July.\n\nRep your state: ${siteUrl}/states\n#LibertyLift1776`,
  },
  {
    label: 'Call out a friend',
    text: `@friend — 1,776 push-ups in 31 days. You vs me, July 1 to July 31. Loser donates to the winner's charity.\n\n#LibertyLift1776\n${siteUrl}`,
  },
  {
    label: 'Gym / group chat',
    text: `Squad challenge for July: 1,776 push-ups each, tracked on a live leaderboard, state vs state. I'm setting up a private contest — reply and I'll send the invite link.\n\n#LibertyLift1776`,
  },
  {
    label: 'Short-form video script',
    text: `Hook: "I have to do 1,776 push-ups this month. Here's why."\nBeat 1: It's the Liberty Lift 1776 challenge — 1,776 push-ups across July, about 58 a day.\nBeat 2: Every rep counts for you AND your state on a national leaderboard.\nBeat 3 (CTA): "Link in bio. Pick your state. Don't let [rival state] win."`,
  },
]

export default function SpreadTheWordPage() {
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
              page and profile link unfurls with its own scoreboard image.
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
