'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function Home() {
  const [daysUntilJuly, setDaysUntilJuly] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
        return
      }
      setLoading(false)
    }
    checkAuth()

    // Calculate days until July
    const july1 = new Date('2026-07-01T00:00:00')
    const now = new Date()
    const diff = july1.getTime() - now.getTime()
    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
    setDaysUntilJuly(days)
  }, [router])

  // Show nothing while checking auth to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-liberty-blue">
        <div className="text-white/50">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="text-6xl mb-6 animate-bounce">🇺🇸</div>
          
          <h1 className="font-bebas text-6xl sm:text-8xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-b from-white to-liberty-gold gold-glow">
            LIBERTY LIFT
          </h1>
          
          <div className="font-bebas text-7xl sm:text-9xl md:text-[12rem] text-liberty-gold gold-glow leading-none">
            1776
          </div>
          
          <p className="text-lg sm:text-xl text-white/70 tracking-[0.3em] uppercase mt-4 mb-8">
            One Nation. One Month. One Challenge.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mb-12">
            <div className="text-center">
              <div className="font-bebas text-5xl sm:text-6xl text-white">1,776</div>
              <div className="text-sm text-white/50 uppercase tracking-wider">Push-ups</div>
            </div>
            <div className="text-center">
              <div className="font-bebas text-5xl sm:text-6xl text-white">31</div>
              <div className="text-sm text-white/50 uppercase tracking-wider">Days</div>
            </div>
            <div className="text-center">
              <div className="font-bebas text-5xl sm:text-6xl text-white">~57</div>
              <div className="text-sm text-white/50 uppercase tracking-wider">Per Day</div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/signup" className="btn-gold text-lg px-8 py-4">
              🦅 Join the Revolution
            </Link>
            <Link href="/leaderboard" className="btn-secondary text-lg px-8 py-4">
              View Leaderboard
            </Link>
          </div>

          {/* Countdown */}
          {daysUntilJuly > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 bg-liberty-gold rounded-full animate-pulse"></span>
              <span className="text-sm text-white/70">
                Launching in <span className="text-liberty-gold font-semibold">{daysUntilJuly}</span> days
              </span>
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-bebas text-5xl text-center text-liberty-gold mb-16">
            HOW IT WORKS
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="font-bebas text-2xl text-white mb-2">1. SIGN UP</h3>
              <p className="text-white/60">
                Create your account and choose your state. Rep your home turf in the state vs state battle.
              </p>
            </div>
            
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">💪</div>
              <h3 className="font-bebas text-2xl text-white mb-2">2. DO PUSH-UPS</h3>
              <p className="text-white/60">
                Log your push-ups daily. Break them up however you want — 57 a day, 100 some days, rest others.
              </p>
            </div>
            
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="font-bebas text-2xl text-white mb-2">3. COMPETE</h3>
              <p className="text-white/60">
                Climb the leaderboard, earn badges, and challenge friends. Hit 1,776 to become a Founding Father.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-bebas text-5xl text-center text-liberty-gold mb-16">
            FEATURES
          </h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '📊', title: 'Personal Dashboard', desc: 'Track your progress with detailed stats and charts' },
              { icon: '🏅', title: 'Achievements', desc: 'Earn badges like Minuteman, Patriot, and Founding Father' },
              { icon: '🗺️', title: 'State Battle', desc: '50 states compete for push-up supremacy' },
              { icon: '🔥', title: 'Streak Tracking', desc: 'Build your streak and never break the chain' },
              { icon: '👥', title: 'Private Contests', desc: 'Create challenges with friends, family, or coworkers' },
              { icon: '📱', title: 'Social Sharing', desc: 'Share milestones and flex on social media' },
              { icon: '📜', title: 'Fun Facts', desc: 'Learn American history as you progress' },
              { icon: '🎯', title: 'Daily Goals', desc: 'Stay on pace with personalized targets' },
            ].map((feature, i) => (
              <div key={i} className="card card-hover p-6">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-white/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Preview */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-bebas text-5xl text-center text-liberty-gold mb-4">
            EARN YOUR BADGES
          </h2>
          <p className="text-center text-white/60 mb-16 max-w-2xl mx-auto">
            Complete milestones to earn achievement badges. Can you collect them all?
          </p>
          
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: '💪', name: 'First Rep', desc: '1 push-up' },
              { icon: '🎖️', name: 'Minuteman', desc: '100 push-ups' },
              { icon: '⚔️', name: 'Continental', desc: '500 push-ups' },
              { icon: '🦅', name: 'Patriot', desc: '888 push-ups' },
              { icon: '🏛️', name: 'Founding Father', desc: '1776 push-ups' },
              { icon: '🐎', name: 'Paul Revere', desc: '7-day streak' },
            ].map((badge, i) => (
              <div key={i} className="achievement w-32">
                <div className="text-4xl">{badge.icon}</div>
                <div className="font-semibold text-sm text-white">{badge.name}</div>
                <div className="text-xs text-white/50">{badge.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-24 px-4 bg-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl sm:text-3xl text-white/80 italic mb-6">
            "The Constitution only guarantees the American people the right to pursue happiness. You have to catch it yourself."
          </blockquote>
          <cite className="text-liberty-gold font-semibold">— Benjamin Franklin</cite>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-bebas text-5xl text-liberty-gold mb-6">
            READY TO EARN YOUR FREEDOM?
          </h2>
          <p className="text-white/70 mb-8">
            Join thousands of patriots in the ultimate fitness challenge. 
            1,776 push-ups. 31 days. Are you in?
          </p>
          <Link href="/signup" className="btn-gold text-xl px-10 py-5 inline-block">
            🇺🇸 Join the Revolution
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🇺🇸</span>
            <span className="font-bebas text-xl text-liberty-gold">LIBERTY LIFT 1776</span>
          </div>
          <div className="text-sm text-white/50">
            © 2026 Liberty Lift 1776. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}
