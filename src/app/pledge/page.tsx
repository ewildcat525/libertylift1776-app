'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import PledgeSetup from '@/components/PledgeSetup'

interface Pledge {
  id: string
  user_id: string
  charity: 'wounded_warrior' | 'save_the_children'
  pledge_type: 'per_completed' | 'per_short'
  rate_cents: number
  is_active: boolean
}

export default function PledgePage() {
  const [user, setUser] = useState<any>(null)
  const [existingPledge, setExistingPledge] = useState<Pledge | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Load existing pledge
      const { data: pledge } = await supabase
        .from('pledges')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      setExistingPledge(pledge)
      setLoading(false)
    }
    loadData()
  }, [router])

  const handleComplete = () => {
    setShowSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/50">Loading...</div>
        </div>
      </>
    )
  }

  if (showSuccess) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-7xl mb-4 animate-bounce">🎖️</div>
            <h1 className="font-bebas text-4xl text-liberty-gold mb-2">Pledge Saved!</h1>
            <p className="text-white/60">Redirecting to dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎗️</div>
            <h1 className="font-bebas text-5xl text-liberty-red mb-2">
              {existingPledge ? 'Update Your Pledge' : 'Make a Pledge'}
            </h1>
            <p className="text-white/60 max-w-md mx-auto">
              Turn your push-ups into real impact. Make an honor-system pledge to donate to charity based on your July performance.
            </p>
          </div>

          {/* Pledge Setup */}
          <div className="card p-8">
            <PledgeSetup
              userId={user.id}
              existingPledge={existingPledge}
              onComplete={handleComplete}
            />
          </div>

          {/* Info section */}
          <div className="mt-8 p-6 rounded-xl bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-3">How it works</h3>
            <ul className="space-y-2 text-white/60 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-liberty-gold">1.</span>
                Choose a charity and pledge type
              </li>
              <li className="flex items-start gap-2">
                <span className="text-liberty-gold">2.</span>
                Set your per-push-up rate
              </li>
              <li className="flex items-start gap-2">
                <span className="text-liberty-gold">3.</span>
                Complete push-ups throughout July
              </li>
              <li className="flex items-start gap-2">
                <span className="text-liberty-gold">4.</span>
                At month's end, donate your pledged amount directly to the charity
              </li>
            </ul>
            <p className="mt-4 text-white/40 text-xs">
              This is an honor-system pledge. We don't collect payment — you donate directly to your chosen charity at the end of the challenge.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
