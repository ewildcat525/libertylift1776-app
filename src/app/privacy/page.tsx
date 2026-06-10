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
        <p className="text-white/50 text-sm mb-10">Last updated: June 9, 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed">
          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">What we collect</h2>
            <p>
              When you create an account we store your email address, the public handle you
              choose, your selected U.S. state, and the push-up counts you log. If you join the
              email list, we store the email address you provide. If you sign in with Google, we
              receive your email address from Google.
            </p>
          </section>

          <section>
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">What is public</h2>
            <p>
              Your public handle, state, push-up totals, streaks, and rankings appear on public
              leaderboards, state boards, your public profile page, and shareable images. Your
              email address is never shown publicly.
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
              on our behalf under their own privacy terms.
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
            <h2 className="font-bebas text-2xl text-liberty-red mb-2">Your choices</h2>
            <p>
              You can edit your public handle at any time from your dashboard. To delete your
              account and associated data, or to unsubscribe from emails, contact us and we will
              take care of it.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
