import type { Metadata } from 'next'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import MerchBuy from '@/components/MerchBuy'
import { merchConfig, merchTotal, formatUsd } from '@/lib/merch'

export const metadata: Metadata = {
  title: 'Merch — Liberty Lift 1776',
  description:
    'The Reps for the Republic tee. You can\'t buy it — you unlock it by finishing all 1,776 push-ups. Transparent pricing, ships in August.',
  openGraph: {
    title: 'Reps for the Republic Tee — Liberty Lift 1776',
    description: 'Earned, not given: finish 1,776 push-ups to unlock it. Ships in August.',
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
                Pre-order &middot; ships in August
              </span>
            </div>
          </div>

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

          {/* The transparent price breakdown — the centerpiece of the page */}
          <div className="card p-6 mb-6">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4">
              The price, all of it
            </h2>
            <dl className="text-white/80">
              <div className="flex justify-between py-2 border-b border-white/10">
                <dt>Shirt</dt>
                <dd className="font-bold">{formatUsd(pricing.shirt)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-white/10">
                <dt>{pricing.shippingLabel}</dt>
                <dd className="font-bold">{formatUsd(pricing.shipping)}</dd>
              </div>
              <div className="flex justify-between py-3 text-white">
                <dt className="font-bebas text-xl tracking-wide">Total at checkout</dt>
                <dd className="font-bebas text-xl text-liberty-gold">{formatUsd(merchTotal)}</dd>
              </div>
            </dl>
            <p className="text-white/50 text-sm">
              That&apos;s the whole number. No hidden fees, no surprise add-ons, no tip screen.
              Sales tax is added at checkout only if your state requires it.
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
              Sizes {product.sizes.join(' / ')} — you pick your size at checkout.
            </p>
          </div>

          {/* Shipping & how buying works */}
          <div className="card p-6 mb-8">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4">
              Shipping &amp; checkout
            </h2>
            <ul className="text-white/70 text-sm space-y-2">
              <li>
                <span className="text-liberty-gold font-bold">{fulfillment.preorderNote}</span>
              </li>
              <li>{fulfillment.shipsFrom}</li>
              {fulfillment.usOnly && <li>US shipping only (for now)</li>}
              <li>
                Ordering unlocks once you&apos;ve logged all {goal} push-ups — this shirt is
                proof of work, not just merch.
              </li>
              <li>
                Checkout is handled by Stripe — we never see your card. On your phone it&apos;s
                two taps with Apple Pay or Google Pay.
              </li>
            </ul>
          </div>

          {/* Buy gate: in-flow CTA + sticky mobile bar */}
          <MerchBuy />
        </div>
      </div>
    </>
  )
}
