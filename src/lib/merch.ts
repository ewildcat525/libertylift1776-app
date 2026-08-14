// Single source of truth for the merch page. Every price and claim shown on
// /merch comes from here — update this file, not the page markup.

import { CHALLENGE_TOTAL } from './dates'

export const merchConfig = {
  // Keep the retired checkout URL out of the client bundle. Keep the matching
  // link deactivated in Stripe too so a previously saved URL cannot accept
  // another 2026 order.
  stripePaymentLink: '' as string,

  product: {
    name: 'Reps for the Republic Tee',
    tagline: 'Two-sided screen print. Earned, not given.',
    // Shown as "what you're getting" bullets — keep these honest and specific.
    details: [
      'Front: full-size "Reps for the Republic" print — 2-color screen print (black + Old Glory red)',
      'Back: LL 1776 vertical spine print',
      'Screen printed, not direct-to-garment — inks are laid on thick and hold up to washing',
      'Made in USA heavyweight cotton tee, printed in the US, unisex fit',
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },

  // The all-in price and the Everlane-style cost breakdown shown on the page.
  // total MUST match what Stripe actually charges (shipping included — do not
  // add a separate shipping rate on the payment link).
  pricing: {
    total: 44,
    breakdown: [
      {
        label: 'Shirt + screen printing',
        note: 'Made in USA tee, printed in the US',
        amount: 37.16,
      },
      {
        label: 'Shipping to your door',
        note: 'USPS, anywhere in the US',
        amount: 5,
      },
      {
        label: 'Payment processing',
        note: 'Card / Apple Pay processing fees',
        amount: 1.58,
      },
    ],
  },

  // Buying is locked until the user finishes the challenge.
  unlock: {
    threshold: CHALLENGE_TOTAL,
  },

  fulfillment: {
    preorderNote: 'The 2026 order window is closed. Every shirt was made only for a finisher who ordered one.',
    shipsFrom: 'Printed and shipped from the USA',
    usOnly: true,
  },

  // The one-time final-call window. The /merch countdown, the buy gate, and
  // the campaign email all read these — never restate a date in markup.
  finalCall: {
    // This manual switch closes every checkout and campaign path immediately,
    // even before the original date-based deadline has passed.
    seasonClosed: true,
    // End of day Thursday, August 13 2026 (EDT is UTC-4).
    ordersCloseAt: '2026-08-14T00:00:00-04:00',
    ordersCloseLabel: 'Thursday, August 13 · 11:59 PM ET',
    firstBatchLabel: 'August 10',
  },
} as const

export const merchTotal = merchConfig.pricing.total

export const ordersCloseAt = new Date(merchConfig.finalCall.ordersCloseAt)

// Ordering is open until the final-call deadline passes. Everything that can
// take money — the buy button, the campaign email — checks this first.
export function ordersOpen(now: Date = new Date()): boolean {
  return !merchConfig.finalCall.seasonClosed && now.getTime() < ordersCloseAt.getTime()
}

export const merchCost = merchConfig.pricing.breakdown.reduce(
  (sum, item) => sum + item.amount,
  0
)

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`
}
