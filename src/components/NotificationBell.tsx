'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient, AppNotification } from '@/lib/supabase'

interface NotificationBellProps {
  userId: string
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const unreadCount = notifications.filter(n => !n.read_at).length

  const resolveActorNames = useCallback(async (items: AppNotification[]) => {
    setActorNames(prev => {
      const missing = Array.from(new Set(items.map(n => n.actor_id))).filter(id => !prev[id])
      if (missing.length > 0) {
        supabase
          .from('public_profiles')
          .select('id, display_name')
          .in('id', missing)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setActorNames(current => {
                const next = { ...current }
                data.forEach((p: { id: string; display_name: string | null }) => {
                  next[p.id] = p.display_name || 'A patriot'
                })
                return next
              })
            }
          })
      }
      return prev
    })
  }, [supabase])

  useEffect(() => {
    let active = true

    const loadNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!active) return
      setNotifications(data || [])
      resolveActorNames(data || [])
    }

    loadNotifications()

    // Unique per mount: reusing a fixed name can collide with a channel that
    // is still tearing down and throw, which crashes the page.
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`notifications-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const notification = payload.new as AppNotification
            setNotifications(prev =>
              prev.some(n => n.id === notification.id) ? prev : [notification, ...prev].slice(0, 20)
            )
            resolveActorNames([notification])
          }
        )
        .subscribe()
    } catch (err) {
      console.error('Notification realtime unavailable:', err)
    }

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggleOpen = async () => {
    const willOpen = !open
    setOpen(willOpen)

    if (willOpen && unreadCount > 0) {
      const now = new Date().toISOString()
      setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })))
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId)
        .is('read_at', null)
    }
  }

  const formatTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        className="relative p-2 text-white/62 hover:text-white transition-colors"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-liberty-red text-white text-[10px] font-bold flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-liberty-dark border border-white/20 shadow-xl z-50">
          <div className="px-4 py-3 border-b border-white/10 flex items-baseline justify-between">
            <span className="font-bebas text-xl text-liberty-red">Call-outs</span>
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              Open chat →
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-sm text-white/40 text-center">
              No call-outs yet. Stay ready. 🦅
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href="/chat"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  {n.type === 'everyone' ? (
                    <p className="text-sm text-white/80">
                      📢{' '}
                      <span className="font-bold text-liberty-red">
                        @{actorNames[n.actor_id] || 'A patriot'}
                      </span>{' '}
                      summoned all patriots
                    </p>
                  ) : (
                    <p className="text-sm text-white/80">
                      <span className="font-bold text-liberty-gold">
                        @{actorNames[n.actor_id] || 'A patriot'}
                      </span>{' '}
                      called you out
                    </p>
                  )}
                  {n.body && (
                    <p className="text-xs text-white/50 truncate mt-0.5">{n.body}</p>
                  )}
                  <p className="text-[10px] text-white/30 mt-1">{formatTime(n.created_at)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
