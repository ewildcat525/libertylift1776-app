import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://libertylift1776.com'),
  title: 'Liberty Lift 1776 — The Push-Up Challenge',
  description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://libertylift1776.com',
    siteName: 'Liberty Lift 1776',
    title: 'Liberty Lift 1776',
    description: 'Complete 1776 push-ups in July. Are you ready to earn your freedom?',
    images: [
      {
        url: 'https://libertylift1776.com/og-image.png',
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
    images: ['https://libertylift1776.com/og-image.png'],
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
