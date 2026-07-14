'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { canUseChat } from '@/lib/flags'
import GlobalChat from '@/components/GlobalChat'
import Navigation from '@/components/Navigation'

export default function ChatPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!canUseChat(user?.email)) {
        router.replace('/leaderboard')
        return
      }
      setUserId(user?.id ?? null)
      setAllowed(true)
    })
  }, [router])

  if (!allowed) return null

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="app-eyebrow mb-3">National feed</div>
            <h1 className="app-title text-6xl sm:text-7xl">Chat</h1>
            <p className="text-white/60 mt-3">
              One feed, all fifty states. Use @ to mention someone — they&apos;ll get a notification.
            </p>
          </div>

          <GlobalChat userId={userId} heightClass="h-[55vh]" />
        </div>
      </div>
    </>
  )
}
