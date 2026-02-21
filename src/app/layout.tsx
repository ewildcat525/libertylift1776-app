import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Liberty Lift 1776 — The Push-Up Challenge',
  description: 'Complete 1776 push-ups in July. One nation. One month. One challenge.',
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
      </body>
    </html>
  )
}
