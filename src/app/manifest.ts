import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liberty Lift 1776',
    short_name: 'Liberty Lift',
    description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#B22234',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
