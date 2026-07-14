'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient, ContestMessage } from '@/lib/supabase'

interface ContestChatProps {
  contestId: string
  userId: string | null
  isMember: boolean
  isCreator: boolean
  memberNames: Record<string, string>
}

const MAX_MESSAGE_LENGTH = 280

// One-tap openers to get the smack talk flowing
const QUICK_JABS = [
  'Is that all you’ve got? 🦅',
  'Scoreboard. 🇺🇸',
  'My grandma logs more reps before breakfast.',
  '1776 won’t reach itself. Pick up the pace.',
]

export default function ContestChat({ contestId, userId, isMember, isCreator, memberNames }: ContestChatProps) {
  const [messages, setMessages] = useState<ContestMessage[]>([])
  const [names, setNames] = useState<Record<string, string>>(memberNames)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const canChat = Boolean(userId) && (isMember || isCreator)

  const supabase = createClient()

  const resolveMissingNames = useCallback(async (msgs: ContestMessage[], known: Record<string, string>) => {
    const missing = Array.from(new Set(msgs.map(m => m.user_id))).filter(id => !known[id])
    if (missing.length === 0) return

    const { data } = await supabase
      .from('public_profiles')
      .select('id, display_name')
      .in('id', missing)

    if (data && data.length > 0) {
      setNames(prev => {
        const next = { ...prev }
        data.forEach((p: { id: string; display_name: string | null }) => {
          next[p.id] = p.display_name || 'Anonymous'
        })
        return next
      })
    }
  }, [supabase])

  useEffect(() => {
    if (!canChat) {
      setLoading(false)
      return
    }

    let active = true

    const loadMessages = async () => {
      const { data } = await supabase
        .from('contest_messages')
        .select('*')
        .eq('contest_id', contestId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!active) return
      const ordered = (data || []).reverse()
      setMessages(ordered)
      setLoading(false)
      resolveMissingNames(ordered, memberNames)
    }

    loadMessages()

    const channel = supabase
      .channel(`contest-chat-${contestId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contest_messages', filter: `contest_id=eq.${contestId}` },
        (payload) => {
          const msg = payload.new as ContestMessage
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
          resolveMissingNames([msg], memberNames)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'contest_messages', filter: `contest_id=eq.${contestId}` },
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
  }, [contestId, canChat])

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
      .from('contest_messages')
      .insert({ contest_id: contestId, user_id: userId, body: trimmed })
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
    await supabase.from('contest_messages').delete().eq('id', id)
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const sameDay = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return sameDay ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="font-bebas text-3xl text-liberty-red">Trash Talk</h2>
        <span className="text-xs text-white/40 uppercase tracking-[0.12em]">Members only</span>
      </div>

      {!canChat ? (
        <div className="text-center py-8">
          <p className="text-white/60 mb-1">🔒 The smack talk stays between rivals.</p>
          <p className="text-white/40 text-sm">Join the contest to unlock the chat.</p>
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
                          {isOwn ? 'You' : names[msg.user_id] || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-white/30">{formatTime(msg.created_at)}</span>
                        {(isOwn || isCreator) && (
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
