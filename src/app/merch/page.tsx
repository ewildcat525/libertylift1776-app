import type { Metadata } from 'next'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import MerchBuy from '@/components/MerchBuy'
import MerchDeadline from '@/components/MerchDeadline'
import { merchConfig, merchTotal, merchCost, formatUsd } from '@/lib/merch'

export const metadata: Metadata = {
  title: '2026 Finisher Tee — Liberty Lift 1776',
  description:
    'The sold-out Reps for the Republic finisher tee. The 2026 order window is closed and every shirt was made only for a finisher who ordered one.',
  openGraph: {
    title: 'Sold Out: 2026 Reps for the Republic Tee — Liberty Lift 1776',
    description: 'The 2026 finisher edition is complete. Earned, made to order, and never offered as ordinary merch.',
    images: [{ url: '/merch/reps-tee-both.jpg', width: 1402, height: 1122 }],
  },
}

export default function MerchPage() {
  const { product, pricing, fulfillment, unlock } = merchConfig
  const goal = unlock.threshold.toLocaleString()

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-28 sm:pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Merch</div>
            <h1 className="app-title text-5xl sm:text-7xl">{product.name}</h1>
            <p className="text-white/60 mt-3">{product.tagline}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] px-2 py-1 bg-liberty-red/15 text-liberty-red border border-liberty-red/40 leading-none">
                Unlocks at {goal} push-ups
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] px-2 py-1 bg-liberty-gold/15 text-liberty-gold border border-liberty-gold/40 leading-none">
                2026 sales complete
              </span>
            </div>
          </div>

          <MerchDeadline />

          {/* Product photos */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <figure className="card overflow-hidden">
              <Image
                src="/merch/reps-tee-front.jpg"
                alt={`Front of the ${product.name}: Reps for the Republic print with flag and push-up artwork`}
                width={711}
                height={1122}
                priority
                className="w-full h-auto"
              />
              <figcaption className="text-center text-white/40 text-xs uppercase tracking-[0.12em] font-bold py-2">
                Front
              </figcaption>
            </figure>
            <figure className="card overflow-hidden">
              <Image
                src="/merch/reps-tee-back.jpg"
                alt={`Back of the ${product.name}: LL 1776 vertical spine print`}
                width={711}
                height={1122}
                priority
                className="w-full h-auto"
              />
              <figcaption className="text-center text-white/40 text-xs uppercase tracking-[0.12em] font-bold py-2">
                Back
              </figcaption>
            </figure>
          </div>

          {/* Everlane-style radical transparency: what it costs us vs. what you pay */}
          <div className="card p-6 mb-6">
            <h2 className="font-bebas text-2xl text-liberty-red mb-1">
              What the 2026 shirt cost
            </h2>
            <p className="text-white/50 text-sm mb-4">
              The completed run was priced transparently, down to the dollar.
            </p>
            <dl className="text-white/80">
              {pricing.breakdown.map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-2 border-b border-white/10">
                  <dt>
                    {item.label}
                    <span className="block text-white/40 text-xs">{item.note}</span>
                  </dt>
                  <dd className="font-bold">{formatUsd(item.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between py-2 border-b border-white/10 text-white/60">
                <dt>Our cost</dt>
                <dd>{formatUsd(merchCost)}</dd>
              </div>
              <div className="flex justify-between py-3 text-white">
                <dt className="font-bebas text-xl tracking-wide">2026 price, all-in</dt>
                <dd className="font-bebas text-xl text-liberty-gold">{formatUsd(merchTotal)}</dd>
              </div>
            </dl>
            <p className="text-white/50 text-sm">
              That leaves {formatUsd(merchTotal - merchCost)} on a {formatUsd(merchTotal)} shirt —
              this isn&apos;t a fundraiser, it&apos;s a trophy at cost. Shipping is included in the
              price. The {formatUsd(merchTotal)} is the whole number — nothing added at checkout.
            </p>
          </div>

          {/* What you're getting */}
          <div className="card p-6 mb-6">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4">
              What you&apos;re getting
            </h2>
            <ul className="text-white/70 text-sm space-y-2 mb-4">
              {product.details.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-liberty-red font-bold" aria-hidden>
                    ★
                  </span>
                  {d}
                </li>
              ))}
            </ul>
            <p className="text-white/50 text-sm">
              The 2026 run was offered in sizes {product.sizes.join(' / ')}.
            </p>
          </div>

          {/* The finished 2026 edition */}
          <div className="card p-6 mb-8">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4">
              The 2026 edition
            </h2>
            <ul className="text-white/70 text-sm space-y-2">
              <li>
                <span className="text-liberty-gold font-bold">{fulfillment.preorderNote}</span>
              </li>
              <li>{fulfillment.shipsFrom}</li>
              {fulfillment.usOnly && <li>US shipping only</li>}
              <li>
                It was available only to people who logged all {goal} push-ups — proof of
                work, not ordinary merch.
              </li>
              <li>The order window will not reopen. The next finisher edition belongs to 2027.</li>
            </ul>
          </div>

          {/* Buy gate: in-flow CTA + sticky mobile bar */}
          <MerchBuy />
        </div>
      </div>
    </>
  )
}
