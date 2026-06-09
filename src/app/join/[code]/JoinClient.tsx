'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient, isValidStateCode } from '@/lib/supabase'
import { clearPendingSignup, generateDisplayName, readPendingSignup } from '@/lib/onboarding'

type JoinState = 'loading' | 'needs-auth' | 'joining' | 'joined' | 'error'

export default function JoinClient() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = String(params.code || '').trim().toUpperCase()

  const [state, setState] = useState<JoinState>('loading')
  const [message, setMessage] = useState('Checking your invite...')

  useEffect(() => {
    const joinFromInvite = async () => {
      const supabase = createClient()

      if (!inviteCode) {
        setState('error')
        setMessage('That invite link is missing a code.')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setState('needs-auth')
        setMessage('Sign up or sign in, then we will add you to this contest automatically.')
        return
      }

      setState('joining')
      setMessage('Adding you to the contest...')

      const pendingSignup = readPendingSignup()
      if (pendingSignup && isValidStateCode(pendingSignup.stateCode)) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, state_code')
          .eq('id', user.id)
          .single()

        const profileUpdates: Record<string, string> = {}
        if (!profile?.display_name) {
          profileUpdates.display_name = pendingSignup.displayName || generateDisplayName(pendingSignup.stateCode)
        }
        if (!profile?.state_code) {
          profileUpdates.state_code = pendingSignup.stateCode
        }

        if (profileError?.code === 'PGRST116') {
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              display_name: profileUpdates.display_name,
              state_code: profileUpdates.state_code,
            })
        } else if (Object.keys(profileUpdates).length > 0) {
          await supabase
            .from('profiles')
            .update(profileUpdates)
            .eq('id', user.id)
        }

        clearPendingSignup()
      }

      const { data: contest, error } = await supabase.rpc('join_contest_by_invite_code', {
        p_invite_code: inviteCode,
      })

      if (error || !contest) {
        setState('error')
        setMessage(error?.message?.includes('Invalid invite code') ? 'That invite code is not valid.' : 'Could not join this contest. Try again from the contests page.')
        return
      }

      setState('joined')
      setMessage(`You are in ${contest.name}.`)
      router.replace(`/contests/${contest.id}`)
    }

    joinFromInvite()
  }, [inviteCode, router])

  const next = `/join/${encodeURIComponent(inviteCode)}`

  return (
    <main className="auth-page">
      <header className="conversion-nav">
        <Link href="/" className="flex items-center gap-3 campaign-nav-mark">
          <span className="campaign-nav-monogram">LL</span>
          <span className="campaign-nav-name">Liberty Lift / 1776</span>
        </Link>
      </header>

      <section className="auth-shell auth-shell-center">
        <div className="auth-card">
          <div className="text-center mb-7">
            <div className="app-eyebrow justify-center mb-3">Contest invite</div>
            <h1 className="app-title text-5xl">Join the board</h1>
            <p className="text-white/60 mt-3">{message}</p>
          </div>

          <div className="generated-handle mb-6" aria-live="polite">
            <span>Invite code</span>
            <strong>{inviteCode || 'Missing'}</strong>
          </div>

          {state === 'needs-auth' && (
            <div className="flex flex-col gap-3">
              <Link href={`/signup?next=${encodeURIComponent(next)}`} className="btn-gold w-full py-3 text-center">
                Join with this invite
              </Link>
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary w-full py-3 text-center">
                I already have an account
              </Link>
            </div>
          )}

          {(state === 'loading' || state === 'joining' || state === 'joined') && (
            <div className="auth-success" role="status">
              {message}
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              <div className="auth-error" role="alert">
                {message}
              </div>
              <Link href="/contests" className="btn-secondary w-full py-3 text-center">
                Browse contests
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
