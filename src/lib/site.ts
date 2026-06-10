// Single source of truth for the canonical site URL.
// NEXT_PUBLIC_SITE_URL wins; Vercel previews fall back to their deploy URL;
// otherwise assume production.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://libertylift1776.com')
