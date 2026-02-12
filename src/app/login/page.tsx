'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center px-4 pt-16">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="font-bebas text-3xl text-liberty-gold mb-4">CHECK YOUR EMAIL</h1>
            <p className="text-white/70 mb-6">
              We sent a magic link to <span className="text-white font-semibold">{email}</span>. 
              Click the link to sign in.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-sm text-liberty-gold hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="card p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🦅</div>
            <h1 className="font-bebas text-4xl text-liberty-gold">SIGN IN</h1>
            <p className="text-white/60 mt-2">Welcome back, patriot</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="patriot@example.com"
                required
              />
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
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <Link href="/signup" className="text-liberty-gold hover:underline">
                Join the Revolution
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
