'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      const { error } = await supabase
        .from('email_subscribers')
        .insert({ email: email.toLowerCase().trim() })

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - email already exists
          setStatus('success')
        } else {
          throw error
        }
      } else {
        setStatus('success')
      }
    } catch (err) {
      console.error('Email capture error:', err)
      setErrorMsg('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto">
        <div className="text-5xl mb-4">🦅</div>
        <h3 className="font-bebas text-3xl text-liberty-gold mb-2">YOU&apos;RE IN, PATRIOT!</h3>
        <p className="text-white/70">
          We&apos;ll send you a heads up before the challenge begins on July 1st.
          Get ready to earn your freedom!
        </p>
      </div>
    )
  }

  return (
    <div className="card p-8 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h3 className="font-bebas text-3xl text-liberty-red mb-2">
          GET EARLY ACCESS
        </h3>
        <p className="text-white/70">
          Be the first to know when the challenge goes live. 
          Plus get our free 30-Day Push-Up Prep Guide!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder="Enter your email"
          className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-liberty-gold focus:ring-1 focus:ring-liberty-gold"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-gold px-6 py-3 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Joining...' : '🇺🇸 Join the List'}
        </button>
      </form>

      {status === 'error' && errorMsg && (
        <p className="text-red-400 text-sm mt-3 text-center">{errorMsg}</p>
      )}

      <p className="text-white/40 text-xs text-center mt-4">
        No spam, ever. Just one email when we launch.
      </p>
    </div>
  )
}
