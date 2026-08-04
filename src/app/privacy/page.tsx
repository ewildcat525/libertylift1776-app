import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Liberty Lift 1776',
  description: 'How Liberty Lift 1776 collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pt-16 pb-12 px-4 app-surface">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          ← Back to Liberty Lift 1776
        </Link>

        <h1 className="app-title text-5xl mb-2">Privacy Policy</h1>
        <p className="text-white/50 text-sm mb-10">Last updated: August 1, 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">What we collect</h2>
            <p>
              When you create an account we store your email address, the public handle you
              choose, your selected U.S. state, and the push-up counts and dates you log. Contest
              membership, pledges, referral attribution, and content you submit to enabled
              community features are also stored. If you join an interest list, we store the
              email address you provide. Google sign-in supplies your email address.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">What is public</h2>
            <p>
              Your public handle, state, daily aggregate progress, totals, streaks, rankings, and
              public pledge total may appear on boards, your public profile, and shareable images.
              During a live Final Push event, completed set size and timing may appear in the live
              activity feed. Notes, log identifiers, and your email address are not public.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">How we use it</h2>
            <p>
              We use your information to run the challenge: tracking progress, computing
              leaderboards, and operating contests. If you joined the email list, we will send
              you challenge-related updates (such as a launch reminder). We do not sell your
              personal information.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Services we rely on</h2>
            <p>
              Account data is stored with Supabase. The site is hosted on Vercel, and we use
              Vercel Analytics to understand aggregate site usage. These providers process data
              on our behalf. The iOS app uses the same hosted service and does not request access
              to contacts, photos, precise location, or Health data.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Charity pledges</h2>
            <p>
              Pledges are honor-system commitments. We do not collect or process payments, and we
              never share your pledge details with charities or payment processors.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Retention and deletion</h2>
            <p>
              Challenge history remains available for campaign records until you delete your
              account. Account deletion permanently removes your profile and associated activity
              from our active database. Backup copies may remain temporarily until routine backup
              retention expires.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Your choices</h2>
            <p>
              You can edit your public handle or permanently delete your account and associated
              challenge data from your dashboard. Every campaign email includes an unsubscribe
              link.
            </p>
            <p className="mt-3">
              Questions or privacy requests? Visit <Link href="/support" className="text-liberty-gold hover:underline">Support</Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
