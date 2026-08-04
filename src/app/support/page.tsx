import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Support — Liberty Lift 1776',
  description: 'Get help with your Liberty Lift 1776 account and challenge activity.',
}

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@libertylift1776.com'

export default function SupportPage() {
  return (
    <main className="app-surface min-h-screen px-4 pb-12 pt-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-white/60 transition-colors hover:text-white">
          ← Back to Liberty Lift 1776
        </Link>
        <div className="app-eyebrow mb-3">We&apos;re here to help</div>
        <h1 className="app-title text-5xl sm:text-6xl">Support</h1>
        <p className="mt-4 leading-relaxed text-white/65">
          For sign-in trouble, account questions, safety concerns, or abuse reports, email our
          support team. Include your public handle but never send a magic link or access token.
        </p>
        <a href={`mailto:${supportEmail}?subject=Liberty%20Lift%20Support`} className="btn-primary mt-7 min-h-12 px-7">
          Email support
        </a>
        <p className="mt-3 break-all text-sm text-white/45">{supportEmail}</p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <section className="card p-5">
            <h2 className="font-bebas text-2xl text-white">Account deletion</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Signed-in participants can permanently delete their account from the bottom of the dashboard.
            </p>
          </section>
          <section className="card p-5">
            <h2 className="font-bebas text-2xl text-white">Exercise safety</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Stop exercising if you feel pain, dizziness, or unusual shortness of breath. Seek professional care when needed.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-5 text-sm">
          <Link href="/privacy" className="text-liberty-gold hover:underline">Privacy policy</Link>
          <Link href="/terms" className="text-liberty-gold hover:underline">Terms of use</Link>
        </div>
      </div>
    </main>
  )
}
