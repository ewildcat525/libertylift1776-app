// Single source of truth for the canonical site URL.
// NEXT_PUBLIC_SITE_URL wins; Vercel previews fall back to their deploy URL;
// otherwise assume production. VERCEL_URL is the deployment-specific
// *.vercel.app host even in production, so only use it for previews.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://libertylift1776.com')

// Public contact address shown on the About page. This inbox does not exist
// yet — set up forwarding for it (or swap in a real address) before launch.
export const contactEmail = 'hello@libertylift1776.com'
