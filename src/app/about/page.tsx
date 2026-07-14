import type { Metadata } from 'next'
import Link from 'next/link'
import { contactEmail } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About — Liberty Lift 1776',
  description:
    'What Liberty Lift 1776 is: a just-for-fun, one-month push-up challenge every July that raises money for charity.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-16 pb-12 px-4 app-surface">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          ← Back to Liberty Lift 1776
        </Link>

        <h1 className="app-title text-5xl mb-2">About</h1>
        <p className="text-white/50 text-sm mb-10">The what, the why, and the who.</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">This is for fun</h2>
            <p>
              Liberty Lift 1776 is exactly what it looks like: a silly-but-serious community
              challenge to knock out 1,776 push-ups during the month of July. There are no
              entry fees, no prizes, no fine print — just you, your state&apos;s honor, and a
              leaderboard full of fellow patriots. If it makes you laugh, do a few push-ups,
              and talk a little friendly trash, it&apos;s working as intended.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">One month a year</h2>
            <p>
              The challenge runs July 1 through July 31 — that&apos;s it. It kicks off with the
              fireworks and wraps when the calendar flips to August. The rest of the year the
              site sits quietly doing push-up-less nothing until the next July rolls around.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">It&apos;s for charity</h2>
            <p>
              The real point is to turn all those reps into a little good. Participants can make
              an optional, honor-system pledge — a few cents per push-up completed — and donate
              directly to charity at the end of the month. We never collect, hold, or process a
              dime; the money goes straight from you to the charity. Every dollar raised is a
              dollar this challenge talked someone into giving.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Who runs this?</h2>
            <p>
              One person with a laptop and a soft spot for push-ups and America. This is a
              hobby project, not a company — expect enthusiasm, not a support department.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Get in touch</h2>
            <p className="mb-6">
              Questions, ideas, bug reports, or trash talk about your state&apos;s ranking —
              send it over.
            </p>
            <a
              href={`mailto:${contactEmail}?subject=Liberty%20Lift%201776`}
              className="campaign-button campaign-button-primary"
            >
              Contact us <span aria-hidden="true">→</span>
            </a>
          </section>
        </div>
      </div>
    </main>
  )
}
