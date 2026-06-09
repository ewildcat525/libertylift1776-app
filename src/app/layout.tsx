import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Liberty Lift 1776 — The Push-Up Challenge',
  description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
  keywords: ['push-up challenge', '1776 push-ups', 'July fitness challenge', 'state fitness competition'],
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Liberty Lift 1776',
    description: 'Complete 1776 push-ups in July. Are you ready to earn your freedom?',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liberty Lift 1776',
    description: 'Complete 1776 push-ups in July. Are you ready to earn your freedom?',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="liberty-bg min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
