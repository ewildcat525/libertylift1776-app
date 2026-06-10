import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { siteUrl } from '@/lib/site'
import './globals.css'

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
    type: 'website',
    url: '/',
    siteName: 'Liberty Lift 1776',
    title: 'Liberty Lift 1776',
    description: 'Complete 1776 push-ups in July. Are you ready to earn your freedom?',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Liberty Lift 1776 - Complete 1776 push-ups in July',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liberty Lift 1776',
    description: 'Complete 1776 push-ups in July. Are you ready to earn your freedom?',
    images: ['/og-image.png'],
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
