// Single source of truth for the merch page. Every price and claim shown on
// /merch comes from here — update this file, not the page markup.

export const merchConfig = {
  // Paste the live Stripe Payment Link here (https://buy.stripe.com/...).
  // While this is empty the buy button renders as a disabled "Coming soon".
  stripePaymentLink: '' as string,

  product: {
    name: 'Reps for the Republic Tee',
    tagline: 'Two-sided screen print. Earned, not given.',
    // Shown as "what you're getting" bullets — keep these honest and specific.
    details: [
      'Front: full-size "Reps for the Republic" print — 2-color screen print (black + Old Glory red)',
      'Back: LL 1776 vertical spine print',
      'Screen printed, not direct-to-garment — inks are laid on thick and hold up to washing',
      'White heavyweight cotton tee, unisex fit',
    ],
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },

  // The transparent cost breakdown. These MUST match what Stripe actually
  // charges — if you change the price or shipping in Stripe, change it here.
  pricing: {
    shirt: 30,
    shipping: 5,
    shippingLabel: 'Flat-rate US shipping',
  },

  fulfillment: {
    shipsWithin: 'Ships within 5–7 business days',
    shipsFrom: 'Printed and shipped from the USA',
    usOnly: true,
  },
} as const

export const merchTotal = merchConfig.pricing.shirt + merchConfig.pricing.shipping

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`
}
