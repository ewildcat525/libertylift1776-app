'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient, ChatMessage } from '@/lib/supabase'

interface GlobalChatProps {
  userId: string | null
}

interface SenderInfo {
  display_name: string | null
  state_code: string | null
}

const MAX_MESSAGE_LENGTH = 280

// One-tap openers to get the smack talk flowing
const QUICK_JABS = [
  'Is that all you’ve got, America? 🦅',
  'Scoreboard. 🇺🇸',
  'My state carries this leaderboard.',
  '1776 won’t reach itself. Pick up the pace.',
]

export default function GlobalChat({ userId }: GlobalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senders, setSenders] = useState<Record<string, SenderInfo>>({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const resolveMissingSenders = useCallback(async (msgs: ChatMessage[]) => {
    setSenders(prev => {
      const missing = Array.from(new Set(msgs.map(m => m.user_id))).filter(id => !prev[id])
      if (missing.length > 0) {
        supabase
          .from('public_profiles')
          .select('id, display_name, state_code')
          .in('id', missing)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setSenders(current => {
                const next = { ...current }
                data.forEach((p: { id: string; display_name: string | null; state_code: string | null }) => {
                  next[p.id] = { display_name: p.display_name, state_code: p.state_code }
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
    if (!userId) {
      setLoading(false)
      return
    }

    let active = true

    const loadMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!active) return
      const ordered = (data || []).reverse()
      setMessages(ordered)
      setLoading(false)
      resolveMissingSenders(ordered)
    }

    loadMessages()

    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
          resolveMissingSenders([msg])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const deletedId = (payload.old as { id?: string }).id
          if (deletedId) {
            setMessages(prev => prev.filter(m => m.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async (body: string) => {
    const trimmed = body.trim()
    if (!trimmed || !userId || sending) return

    setSending(true)
    setError(null)

    const { data, error: sendError } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, body: trimmed })
      .select()
      .single()

    if (sendError) {
      setError(sendError.message.includes('not allowed')
        ? 'That message is not allowed.'
        : sendError.message.includes('Easy there')
          ? 'Easy there, patriot. Max 10 messages per minute.'
          : 'Could not send. Try again.')
    } else {
      setInput('')
      if (data) {
        setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data]))
      }
    }
    setSending(false)
  }

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    await supabase.from('chat_messages').delete().eq('id', id)
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return sameDay ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
  }

  const senderLabel = (id: string) => {
    const sender = senders[id]
    if (!sender) return 'Anonymous'
    const name = sender.display_name || 'Anonymous'
    return sender.state_code ? `${name} · ${sender.state_code}` : name
  }

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-bebas text-3xl text-liberty-red">Trash Talk</h2>
        <span className="text-xs text-white/40 uppercase tracking-[0.12em]">Nationwide</span>
      </div>

      {!userId ? (
        <div className="text-center py-8">
          <p className="text-white/60 mb-1">🔒 The smack talk stays between patriots.</p>
          <p className="text-white/40 text-sm">
            <Link href="/login" className="text-liberty-gold hover:underline">Sign in</Link> to join the chat.
          </p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-3 mb-4 pr-1">
            {loading ? (
              <p className="text-white/40 text-sm text-center py-6">Loading the banter...</p>
            ) : messages.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-6">
                Silence before the battle. Fire the first shot. 🎯
              </p>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.user_id === userId
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group max-w-[85%] px-3 py-2 border ${
                      isOwn
                        ? 'bg-liberty-gold/10 border-liberty-gold/30'
                        : 'bg-white/[0.04] border-white/15'
                    }`}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={`text-xs font-bold ${isOwn ? 'text-liberty-gold' : 'text-white/70'}`}>
                          {isOwn ? 'You' : senderLabel(msg.user_id)}
                        </span>
                        <span className="text-[10px] text-white/30">{formatTime(msg.created_at)}</span>
                        {isOwn && (
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="text-[10px] text-white/30 hover:text-liberty-red opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                            aria-label="Delete message"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-white/85 break-words whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_JABS.map((jab) => (
              <button
                key={jab}
                onClick={() => sendMessage(jab)}
                disabled={sending}
                className="text-xs px-3 py-1.5 bg-white/[0.04] border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
              >
                {jab}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Talk your trash..."
              className="flex-1 bg-white/[0.04] border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-liberty-gold/50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="btn-gold text-sm py-2 px-4 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>

          {error && <p className="text-liberty-red text-xs mt-2">{error}</p>}
          {input.length >= MAX_MESSAGE_LENGTH - 40 && (
            <p className="text-white/30 text-xs mt-2">{MAX_MESSAGE_LENGTH - input.length} characters left</p>
          )}
        </>
      )}
    </div>
  )
}
