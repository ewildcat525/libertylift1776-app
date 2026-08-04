'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase'
import { challengePhase } from '@/lib/dates'

const tabs = [
  {
    href: '/dashboard',
    label: 'Today',
    icon: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6" />,
  },
  {
    href: '/leaderboard',
    label: 'Boards',
    icon: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
  },
  {
    href: '/contests',
    label: 'Crews',
    icon: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
  {
    href: '/profile',
    label: 'Me',
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  },
]

async function tapFeedback() {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Navigation must never depend on optional tactile feedback.
  }
}

export default function NativeAppNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [challengeEnded, setChallengeEnded] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    setChallengeEnded(challengePhase() === 'ended')

    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const root = document.documentElement
    root.classList.toggle('native-tabs-visible', Boolean(user))
    return () => root.classList.remove('native-tabs-visible')
  }, [user])

  if (!user) return null

  const openLogger = () => {
    void tapFeedback()
    if (challengeEnded) {
      router.push('/finale')
      return
    }
    if (pathname === '/dashboard') {
      window.dispatchEvent(new CustomEvent('libertylift:open-log'))
      return
    }
    router.push('/dashboard?log=1')
  }

  return (
    <nav className="native-tab-bar" aria-label="App navigation">
      <div className="native-tab-bar-inner">
        {tabs.slice(0, 2).map((tab) => (
          <NativeTab key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
        ))}
        <button
          type="button"
          className={`native-log-tab ${pathname.startsWith('/finale') ? 'is-active' : ''}`}
          onClick={openLogger}
          aria-label={challengeEnded ? 'Open the finale' : 'Log push-ups'}
        >
          <span className="native-log-tab-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              {challengeEnded
                ? <><path d="M6 21V4M6 5h11l-2.5 3L17 11H6" /></>
                : <path d="M12 5v14M5 12h14" />}
            </svg>
          </span>
          <span>{challengeEnded ? 'Finale' : 'Log'}</span>
        </button>
        {tabs.slice(2).map((tab) => (
          <NativeTab key={tab.href} {...tab} active={pathname.startsWith(tab.href)} />
        ))}
      </div>
    </nav>
  )
}

function NativeTab({ href, label, icon, active }: (typeof tabs)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`native-tab ${active ? 'is-active' : ''}`}
      aria-current={active ? 'page' : undefined}
      onClick={() => void tapFeedback()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
      <span>{label}</span>
    </Link>
  )
}
