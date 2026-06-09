import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use — Liberty Lift 1776',
  description: 'The rules of the road for the Liberty Lift 1776 push-up challenge.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen pt-16 pb-12 px-4 app-surface">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          ← Back to Liberty Lift 1776
        </Link>

        <h1 className="app-title text-5xl mb-2">Terms of Use</h1>
        <p className="text-white/50 text-sm mb-10">Last updated: June 9, 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">The challenge</h2>
            <p>
              Liberty Lift 1776 is a free community fitness challenge: 1,776 push-ups logged
              between July 1 and July 31, 2026. Progress is self-reported on the honor system.
              Logging is limited to reasonable daily amounts to keep the boards fair.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Fair play</h2>
            <p>
              Log only push-ups you actually did. We may remove logs, handles, or accounts that
              are abusive, fraudulent, or that game the leaderboards. Public handles must not
              contain offensive language.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Health and safety</h2>
            <p>
              Push-ups are exercise, and exercise carries risk. Participate within your own
              limits and consult a medical professional before starting any fitness program. You
              participate at your own risk; the challenge organizers are not liable for injuries.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Charity pledges</h2>
            <p>
              Pledges are personal, honor-system commitments between you and the charity you
              choose. We do not process payments, verify donations, or act as an agent of any
              charity. Charity names are used for identification only and do not imply
              endorsement.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Your content</h2>
            <p>
              Your handle, state, and logged totals are displayed publicly as part of the
              challenge, including on shareable images and public profile pages. Don&apos;t use a
              handle you don&apos;t want the world to see.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Changes</h2>
            <p>
              We may update these terms or the challenge rules as needed. Material changes will
              be posted on this page.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
