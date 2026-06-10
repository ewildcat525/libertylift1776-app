import type { MetadataRoute } from 'next'
import { US_STATES } from '@/lib/supabase'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/signup`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/states`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/leaderboard`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${siteUrl}/contests`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${siteUrl}/spread-the-word`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/login`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ]

  const stateRoutes: MetadataRoute.Sitemap = Object.keys(US_STATES).map((code) => ({
    url: `${siteUrl}/states/${code}`,
    changeFrequency: 'hourly',
    priority: 0.7,
  }))

  return [...staticRoutes, ...stateRoutes]
}
