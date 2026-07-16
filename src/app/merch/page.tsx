import type { Metadata } from 'next'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import { merchConfig, merchTotal, formatUsd } from '@/lib/merch'

export const metadata: Metadata = {
  title: 'Merch — Liberty Lift 1776',
  description:
    'The Reps for the Republic tee. Two-sided screen print, transparent pricing — the total you see is the total you pay.',
  openGraph: {
    title: 'Reps for the Republic Tee — Liberty Lift 1776',
    description: 'Two-sided screen print. Transparent pricing, Apple Pay checkout.',
    images: [{ url: '/merch/reps-tee-both.jpg', width: 1402, height: 1122 }],
  },
}

function BuyButton({ className = '' }: { className?: string }) {
  const { stripePaymentLink } = merchConfig
  if (!stripePaymentLink) {
    return (
      <span
        className={`btn-primary opacity-40 cursor-not-allowed select-none ${className}`}
        aria-disabled="true"
      >
        Coming soon
      </span>
    )
  }
  return (
    <a href={stripePaymentLink} className={`btn-primary ${className}`}>
      Buy — {formatUsd(merchTotal)} all-in
    </a>
  )
}

function PaymentMethods() {
  return (
    <p className="text-white/50 text-xs uppercase tracking-[0.12em] font-bold">
      Apple Pay &middot; Google Pay &middot; Card — secure checkout by Stripe
    </p>
  )
}

export default function MerchPage() {
  const { product, pricing, fulfillment } = merchConfig

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-28 sm:pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Merch</div>
            <h1 className="app-title text-5xl sm:text-7xl">{product.name}</h1>
            <p className="text-white/60 mt-3">{product.tagline}</p>
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
              <li>{fulfillment.shipsWithin}</li>
              <li>{fulfillment.shipsFrom}</li>
              {fulfillment.usOnly && <li>US shipping only (for now)</li>}
              <li>
                Checkout is handled by Stripe — we never see your card. On your phone it&apos;s
                two taps with Apple Pay or Google Pay.
              </li>
            </ul>
          </div>

          {/* Desktop / in-flow CTA */}
          <div className="text-center hidden sm:block">
            <BuyButton className="px-10 py-4 text-lg" />
            <div className="mt-3">
              <PaymentMethods />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky mobile buy bar: price always visible, one thumb tap to buy */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-liberty-dark/95 backdrop-blur border-t border-white/15 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-bebas text-2xl text-white leading-none">
              {formatUsd(merchTotal)}
            </div>
            <div className="text-white/50 text-[10px] uppercase tracking-[0.12em] font-bold">
              shirt + shipping, all-in
            </div>
          </div>
          <BuyButton className="flex-1 max-w-[220px] py-3" />
        </div>
      </div>
    </>
  )
}
