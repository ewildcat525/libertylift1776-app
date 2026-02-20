'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navigation() {
  const pathname = usePathname()
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
  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/states', label: 'States' },
        { href: '/contests', label: 'Contests' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/leaderboard', label: 'Leaderboard' },
        { href: '/states', label: 'States' },
        { href: '/contests', label: 'Contests' },
      ]

  const isActive = (href: string) => pathname === href

  // Home link goes to dashboard if logged in
  const homeLink = user ? '/dashboard' : '/'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-liberty-dark/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={homeLink} className="flex items-center gap-2">
            <span className="text-2xl">🇺🇸</span>
            <span className="font-bebas text-2xl text-liberty-gold">LIBERTY LIFT</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'text-liberty-gold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/signup" className="btn-primary text-sm py-2">
                  Join the Revolution
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

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-2 text-sm font-medium ${
                  isActive(link.href) ? 'text-liberty-gold' : 'text-white/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
              {user ? (
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false); }}
                  className="text-sm text-white/70 py-2 text-left"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-white/70 py-2">
                    Sign In
                  </Link>
                  <Link href="/signup" className="btn-primary text-sm py-2 text-center">
                    Join the Revolution
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
