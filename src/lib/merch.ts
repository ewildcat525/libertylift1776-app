// Single source of truth for the merch page. Every price and claim shown on
// /merch comes from here — update this file, not the page markup.

import { CHALLENGE_TOTAL } from './dates'

export const merchConfig = {
  // Paste the live Stripe Payment Link here (https://buy.stripe.com/...).
  // While this is empty the buy button renders as a disabled "Coming soon"
  // even for people who have unlocked it.
  stripePaymentLink: 'https://buy.stripe.com/00waER0kX0pBfNR1qY67S00' as string,

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
    preorderNote: 'Orders are open now — all shirts ship in August.',
    shipsFrom: 'Printed and shipped from the USA',
    usOnly: true,
  },
} as const

export const merchTotal = merchConfig.pricing.total

export const merchCost = merchConfig.pricing.breakdown.reduce(
  (sum, item) => sum + item.amount,
  0
)

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`
}
