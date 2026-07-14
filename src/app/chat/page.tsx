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
      {/* App-style chat screen: the page never scrolls, only the message list
          does. 100dvh tracks the mobile browser's collapsing toolbars; the
          inline style falls back to h-screen where dvh is unsupported. */}
      <div className="app-surface flex flex-col h-screen" style={{ height: '100dvh' }}>
        <div className="flex-1 min-h-0 flex flex-col w-full max-w-3xl mx-auto px-4 pt-20 sm:pt-24 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between gap-4 mb-3 sm:mb-5">
            <h1 className="app-title text-4xl sm:text-6xl">Chat</h1>
            <span className="app-eyebrow">National feed</span>
          </div>
          <p className="hidden sm:block text-white/60 mb-5">
            One feed, all fifty states. Use @ to mention someone — they&apos;ll get a notification.
          </p>

          <GlobalChat userId={userId} />
        </div>
      </div>
    </>
  )
}
