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
const MENTION_PATTERN = /(@[A-Za-z0-9_]+)/g

export default function GlobalChat({ userId }: GlobalChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senders, setSenders] = useState<Record<string, SenderInfo>>({})
  // messageId -> { count, mine } for 👍 reactions
  const [reactions, setReactions] = useState<Record<string, { count: number; mine: boolean }>>({})
  const [myHandle, setMyHandle] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; display_name: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Follow new messages only while the reader is at (or near) the bottom, so
  // incoming chatter doesn't yank them away from older messages.
  const followBottomRef = useRef(true)

  const supabase = createClient()

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

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

  // Load 👍 counts for a batch of messages (initial load only — messages that
  // arrive later via realtime start with zero reactions).
  const loadReactions = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return
    const { data } = await supabase
      .from('chat_message_reactions')
      .select('message_id, user_id')
      .in('message_id', messageIds)

    if (!data) return
    setReactions(prev => {
      const next = { ...prev }
      messageIds.forEach(id => { next[id] = { count: 0, mine: false } })
      data.forEach((r: { message_id: string; user_id: string }) => {
        const entry = next[r.message_id] || { count: 0, mine: false }
        entry.count += 1
        if (r.user_id === userId) entry.mine = true
        next[r.message_id] = entry
      })
      return next
    })
  }, [supabase, userId])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let active = true

    supabase
      .from('public_profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (active && data?.display_name) setMyHandle(data.display_name)
      })

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
      loadReactions(ordered.map(m => m.id))
    }

    loadMessages()

    // Unique per mount: reusing a fixed name can collide with a channel that
    // is still tearing down and throw, which crashes the page.
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`global-chat-${Math.random().toString(36).slice(2)}`)
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
        // Reactions from other users (our own are applied optimistically, so
        // skip them here to avoid double-counting).
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_message_reactions' },
          (payload) => {
            const r = payload.new as { message_id: string; user_id: string }
            if (r.user_id === userId) return
            setReactions(prev => {
              const cur = prev[r.message_id] || { count: 0, mine: false }
              return { ...prev, [r.message_id]: { count: cur.count + 1, mine: cur.mine } }
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chat_message_reactions' },
          (payload) => {
            const r = payload.old as { message_id?: string; user_id?: string }
            if (!r.message_id || r.user_id === userId) return
            setReactions(prev => {
              const cur = prev[r.message_id!] || { count: 0, mine: false }
              return { ...prev, [r.message_id!]: { count: Math.max(0, cur.count - 1), mine: cur.mine } }
            })
          }
        )
        .subscribe()
    } catch (err) {
      console.error('Chat realtime unavailable:', err)
    }

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (followBottomRef.current) scrollToBottom()
  }, [messages])

  const handleListScroll = () => {
    const el = scrollRef.current
    if (el) {
      followBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    }
  }

  // @mention autocomplete against public handles
  const updateInput = async (value: string) => {
    setInput(value)
    const mention = /@([A-Za-z0-9_]*)$/.exec(value)
    if (!mention) {
      setSuggestions([])
      return
    }

    const { data } = await supabase
      .from('public_profiles')
      .select('id, display_name')
      .ilike('display_name', `${mention[1]}%`)
      .not('display_name', 'is', null)
      .neq('id', userId)
      .limit(5)

    setSuggestions((data || []).filter((p: { display_name: string | null }) => p.display_name) as { id: string; display_name: string }[])
  }

  const applySuggestion = (handle: string) => {
    setInput(prev => prev.replace(/@[A-Za-z0-9_]*$/, `@${handle} `))
    setSuggestions([])
    inputRef.current?.focus()
  }

  const sendMessage = async (body: string) => {
    const trimmed = body.trim()
    if (!trimmed || !userId || sending) return

    setSending(true)
    setError(null)
    setSuggestions([])

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
      followBottomRef.current = true
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

  // Toggle our 👍 on a message, optimistically, reverting on error.
  const toggleReaction = async (messageId: string) => {
    if (!userId) return
    const current = reactions[messageId] || { count: 0, mine: false }
    const optimistic = current.mine
      ? { count: Math.max(0, current.count - 1), mine: false }
      : { count: current.count + 1, mine: true }
    setReactions(prev => ({ ...prev, [messageId]: optimistic }))

    const { error: reactError } = current.mine
      ? await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
      : await supabase
          .from('chat_message_reactions')
          .insert({ message_id: messageId, user_id: userId })

    if (reactError) {
      setReactions(prev => ({ ...prev, [messageId]: current }))
    }
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

  const renderBody = (body: string) => {
    return body.split(MENTION_PATTERN).map((part, i) => {
      if (!part.startsWith('@')) return part
      const isMe = myHandle && part.slice(1).toLowerCase() === myHandle.toLowerCase()
      return (
        <span
          key={i}
          className={isMe ? 'text-liberty-gold font-bold bg-liberty-gold/15 px-0.5' : 'text-liberty-gold'}
        >
          {part}
        </span>
      )
    })
  }

  const mentionSender = (msg: ChatMessage) => {
    const handle = senders[msg.user_id]?.display_name
    if (handle) {
      updateInput(input.trim() ? `${input.trim()} @${handle} ` : `@${handle} `)
      inputRef.current?.focus()
    }
  }

  if (!userId) {
    return (
      <div className="card p-6 text-center py-8">
        <p className="text-white/60 mb-1">🔒 The smack talk stays between patriots.</p>
        <p className="text-white/40 text-sm">
          <Link href="/login" className="text-liberty-gold hover:underline">Sign in</Link> to join the chat.
        </p>
      </div>
    )
  }

  return (
    <div className="card flex-1 min-h-0 flex flex-col p-3 sm:p-6">
      {/* Message list: the only scrollable region. overscroll-contain keeps
          the scroll from chaining to the page on mobile. */}
      <div
        ref={scrollRef}
        onScroll={handleListScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 mb-3 pr-1"
      >
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
                    {isOwn ? (
                      <span className="text-xs font-bold text-liberty-gold">You</span>
                    ) : (
                      <button
                        onClick={() => mentionSender(msg)}
                        className="text-xs font-bold text-white/70 hover:text-liberty-gold transition-colors"
                        title="Mention this patriot"
                      >
                        {senderLabel(msg.user_id)}
                      </button>
                    )}
                    <span className="text-[10px] text-white/30">{formatTime(msg.created_at)}</span>
                    {isOwn && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-[10px] text-white/30 hover:text-liberty-red opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-auto"
                        aria-label="Delete message"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-white/85 break-words whitespace-pre-wrap">{renderBody(msg.body)}</p>
                  <div className={`flex mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <button
                      onClick={() => toggleReaction(msg.id)}
                      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 border transition-colors ${
                        reactions[msg.id]?.mine
                          ? 'border-liberty-gold/50 text-liberty-gold bg-liberty-gold/10'
                          : 'border-white/10 text-white/40 hover:text-white/80 hover:border-white/25'
                      }`}
                      aria-label={reactions[msg.id]?.mine ? 'Remove thumbs up' : 'Thumbs up'}
                      aria-pressed={Boolean(reactions[msg.id]?.mine)}
                    >
                      <span aria-hidden="true">👍</span>
                      {reactions[msg.id]?.count ? <span>{reactions[msg.id].count}</span> : null}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="relative">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-liberty-dark border border-white/20 divide-y divide-white/10 z-10">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => applySuggestion(s.display_name)}
                className="block w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
              >
                @{s.display_name}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className="flex gap-2"
        >
          {/* text-base (16px) on mobile so iOS Safari doesn't auto-zoom the
              page when the input is focused. */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => updateInput(e.target.value)}
            onFocus={() => {
              // Keep the latest messages visible once the keyboard settles.
              setTimeout(() => {
                if (followBottomRef.current) scrollToBottom()
              }, 300)
            }}
            maxLength={MAX_MESSAGE_LENGTH}
            enterKeyHint="send"
            autoComplete="off"
            placeholder="Talk your trash... use @ to call someone out"
            className="flex-1 min-w-0 bg-white/[0.04] border border-white/15 px-3 py-2 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-liberty-gold/50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-gold text-sm py-2 px-4 disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {error && <p className="text-liberty-red text-xs mt-2">{error}</p>}
      {input.length >= MAX_MESSAGE_LENGTH - 40 && (
        <p className="text-white/30 text-xs mt-2">{MAX_MESSAGE_LENGTH - input.length} characters left</p>
      )}
    </div>
  )
}
