import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { siteUrl } from '@/lib/site'
import AppEnvironment from '@/components/AppEnvironment'
import NativeBridge from '@/components/NativeBridge'
import ConnectivityNotice from '@/components/ConnectivityNotice'
import NativeAppNavigation from '@/components/NativeAppNavigation'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#10100f',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Liberty Lift 1776 — The Push-Up Challenge',
  description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
  keywords: ['push-up challenge', '1776 push-ups', 'July fitness challenge', 'state fitness competition'],
  icons: {
    icon: '/favicon.svg',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Liberty Lift',
  },
  formatDetection: {
    telephone: false,
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
        <AppEnvironment />
        <NativeBridge />
        <ConnectivityNotice />
        {children}
        <NativeAppNavigation />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
