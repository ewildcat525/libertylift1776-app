'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import GlobalChat from '@/components/GlobalChat'
import Navigation from '@/components/Navigation'

export default function ChatPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setChecked(true)
    })
  }, [])

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="app-eyebrow mb-3">National feed</div>
            <h1 className="app-title text-6xl sm:text-7xl">Trash Talk</h1>
            <p className="text-white/60 mt-3">
              One feed, fifty states, zero mercy. Use @ to call someone out — they&apos;ll get the notification.
            </p>
          </div>

          {checked && <GlobalChat userId={userId} heightClass="h-[55vh]" />}
        </div>
      </div>
    </>
  )
}
