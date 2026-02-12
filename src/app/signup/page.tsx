'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { US_STATES } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          state_code: stateCode || null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Update profile with display name and state
    if (data.user) {
      await supabase.from('profiles').update({
        display_name: displayName,
        state_code: stateCode || null,
      }).eq('id', data.user.id)
    }

    router.push('/dashboard')
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="card p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🇺🇸</div>
            <h1 className="font-bebas text-4xl text-liberty-gold">JOIN THE REVOLUTION</h1>
            <p className="text-white/60 mt-2">Create your account and start your journey to 1776</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="patriot@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Display Name *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Your name or handle"
                required
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Your State <span className="text-white/40">(for state competition)</span>
              </label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="input bg-white/5"
              >
                <option value="">Select your state...</option>
                {Object.entries(US_STATES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-liberty-red/20 border border-liberty-red/50 rounded-lg text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : '🦅 Join the Revolution'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-liberty-gold hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-white/40 text-center">
              By signing up, you're committing to the pursuit of fitness and freedom. 
              No taxation without perspiration! 💪
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
