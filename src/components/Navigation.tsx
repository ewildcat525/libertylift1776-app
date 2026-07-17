'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { canUseChat } from '@/lib/flags'
import NotificationBell from '@/components/NotificationBell'
import type { User } from '@supabase/supabase-js'

export default function Navigation() {
  const pathname = usePathname()
  const isCampaignHome = pathname === '/'
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Different nav links for logged in vs logged out
  const showChat = canUseChat(user?.email)

  const navLinks = isCampaignHome
    ? [
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/pledge/leaderboard', label: 'Pledges' },
        { href: '/states', label: 'States' },
        { href: '/contests', label: 'Contests' },
        { href: '/merch', label: 'Merch' },
      ]
    : user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/pledge/leaderboard', label: 'Pledges' },
        { href: '/states', label: 'States' },
        { href: '/contests', label: 'Contests' },
        { href: '/merch', label: 'Merch' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/pledge/leaderboard', label: 'Pledges' },
        { href: '/states', label: 'States' },
        { href: '/contests', label: 'Contests' },
        { href: '/merch', label: 'Merch' },
      ]

  if (showChat) {
    navLinks.push({ href: '/chat', label: 'Chat' })
  }

  const isActive = (href: string) => pathname === href

  const homeLink = '/'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${
      isCampaignHome ? 'campaign-nav' : 'campaign-nav app-nav'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeLink} className="flex items-center gap-3 campaign-nav-mark">
            <span className="campaign-nav-monogram">LL</span>
            <span className="campaign-nav-name">Liberty Lift / 1776</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? 'text-liberty-red'
                    : 'text-white/62 hover:text-white'
                }`}
              >
                {link.label}
                {link.href === '/chat' && (
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] px-1.5 py-0.5 bg-liberty-gold/15 text-liberty-gold border border-liberty-gold/40 leading-none">
                    Beta
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right side: bell (single instance for all breakpoints) + auth + mobile menu */}
          <div className="flex items-center gap-2">
          {user && showChat && <NotificationBell userId={user.id} />}

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-xs font-bold uppercase tracking-[0.12em] text-white/62 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/login" className="text-xs font-bold uppercase tracking-[0.12em] text-white/62 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/signup" className="campaign-nav-cta">
                  Accept the challenge
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-1.5 py-2 text-sm font-medium ${
                  isActive(link.href) ? 'text-liberty-red' : 'text-white/70'
                }`}
              >
                {link.label}
                {link.href === '/chat' && (
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.1em] px-1.5 py-0.5 bg-liberty-gold/15 text-liberty-gold border border-liberty-gold/40 leading-none">
                    Beta
                  </span>
                )}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="text-sm font-bold uppercase tracking-[0.12em] text-white/70 py-2 text-left"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-white/70 py-2">
                    Sign In
                  </Link>
                  <Link href="/signup" className="campaign-nav-cta text-center">
                    Accept the challenge
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
