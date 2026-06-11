'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CHARITY_DONATE_URLS } from '@/lib/charities'
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
        <div className="min-h-screen flex items-center justify-center app-surface">
          <div className="text-center">
            <div className="app-eyebrow justify-center mb-3">Pledge saved</div>
            <h1 className="app-title text-5xl mb-2">You are on the board.</h1>
            <p className="text-white/60">Redirecting to dashboard...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Push-ups with purpose</div>
            <h1 className="app-title text-6xl sm:text-7xl">
              {existingPledge ? 'Update Your Pledge' : 'Make a Pledge'}
            </h1>
            <p className="text-white/60 max-w-md mt-3">
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
          <div className="mt-8 p-6 bg-white/[0.035] border border-white/15">
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
                <span>
                  At month&apos;s end, donate your pledged amount directly to the charity — WWP
                  pledges go through our{' '}
                  <a
                    href={CHARITY_DONATE_URLS.wounded_warrior}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-liberty-gold hover:underline"
                  >
                    official WWP fundraiser page
                  </a>
                </span>
              </li>
            </ul>
            <p className="mt-4 text-white/40 text-xs">
              This is an honor-system pledge. We don&apos;t collect payment — you donate directly to your chosen charity at the end of the challenge.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
