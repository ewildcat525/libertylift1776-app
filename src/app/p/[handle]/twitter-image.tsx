// Explicit twitter:image for X cards — reuses this segment's OG card.
// X is supposed to fall back to og:image, but being explicit removes a
// variable when cards fail to render.
export { default, alt, size, contentType } from './opengraph-image'
export const runtime = 'edge'
