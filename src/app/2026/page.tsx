import type { Metadata } from 'next'
import Link from 'next/link'
import { siteUrl } from '@/lib/site'
import Notify2027 from './Notify2027'

export const metadata: Metadata = {
  title: 'LIBERTY LIFT 1776 — 2026 FINAL RECORD',
  description:
    'July 1–31, 2026 · First public year. 219 patriots enlisted. 357,879 push-ups. 24 states on the board. 95 finished all 1,776.',
  alternates: { canonical: `${siteUrl}/2026` },
  openGraph: {
    title: 'LIBERTY LIFT 1776 — 2026 FINAL RECORD',
    description:
      'July 1–31, 2026 · First public year. 219 patriots enlisted. 357,879 push-ups. 24 states on the board. 95 finished all 1,776.',
    url: `${siteUrl}/2026`,
  },
}

const HERO: { value: string; label: string; featured?: boolean }[] = [
  { value: '219', label: 'patriots enlisted' },
  { value: '357,879', label: 'push-ups', featured: true },
  { value: '24', label: 'states on the board' },
  { value: '95', label: 'finished all 1,776' },
]

const STATES = [
  { rank: '01', name: 'Georgia', people: '44', reps: '91,939' },
  { rank: '02', name: 'North Carolina', people: '42', reps: '79,537' },
  { rank: '03', name: 'Maryland', people: '23', reps: '55,482' },
] as const

const AWARDS = [
  { name: 'Crown', holder: 'MDLifterCannon7 (MD)', record: '17,315' },
  { name: 'Final Push', holder: 'same athlete, July 31', record: '4,265' },
  { name: 'Iron Streak', holder: '5 people', record: '31 days' },
  { name: 'Rally Cry', holder: 'Zenglert (GA)', record: '11 recruited' },
] as const

export default function Record2026Page() {
  return (
    <main className="record-2026">
      <article className="record-2026-sheet">
        <header className="record-2026-header">
          <p className="record-2026-mark">
            <Link href="/">Liberty Lift 1776</Link>
          </p>
          <h1>LIBERTY LIFT 1776 — 2026 FINAL RECORD</h1>
          <p className="record-2026-when">July 1–31, 2026 · First public year</p>
        </header>

        <section className="record-2026-hero" aria-label="2026 totals">
          <ul className="record-2026-numbers">
            {HERO.map((stat) => (
              <li key={stat.label} className={stat.featured ? 'is-featured' : undefined}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="record-2026-block" aria-labelledby="state-battle-title">
          <h2 id="state-battle-title">State battle</h2>
          <ol className="record-2026-states">
            {STATES.map((state) => (
              <li key={state.name}>
                <span className="record-2026-rank">{state.rank}</span>
                <span className="record-2026-state-name">{state.name}</span>
                <span className="record-2026-state-count">
                  {state.people} / {state.reps}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="record-2026-block" aria-labelledby="awards-title">
          <h2 id="awards-title">Awards</h2>
          <ul className="record-2026-awards">
            {AWARDS.map((award) => (
              <li key={award.name}>
                <span>{award.name}</span>
                <strong>{award.holder}</strong>
                <b>{award.record}</b>
              </li>
            ))}
          </ul>
        </section>

        <section className="record-2026-block record-2026-pledge" aria-labelledby="pledges-title">
          <h2 id="pledges-title">Pledges</h2>
          <p className="record-2026-pledge-sum">$2,039</p>
          <p>to Wounded Warrior Project</p>
          <p className="record-2026-pledge-note">
            21 people; honor system, we never collected
          </p>
        </section>

        <section className="record-2026-block record-2026-next" aria-labelledby="next-year-title">
          <h2 id="next-year-title" className="record-2026-seal">
            The record is sealed. July 2027 is next.
          </h2>
          <div className="record-2026-actions">
            <Link href="/finale" className="record-2026-hall">
              Enter the Hall
            </Link>
            <Notify2027 />
          </div>
        </section>

        <footer className="record-2026-footer">
          <p>libertylift1776.com/2026</p>
        </footer>
      </article>
    </main>
  )
}
