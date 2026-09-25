'use client'

// In the iOS app the log card becomes a bottom sheet, opened from the tab
// bar ("libertylift:open-log"), a ?log=1 deep link, or the Log a set button.
// While open it traps focus, locks page scroll and closes on Escape.
import { useEffect, useRef, useState } from 'react'
import { isNativeApp } from '@/lib/native-auth'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export function useNativeLogger() {
  const [nativeMode, setNativeMode] = useState(false)
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isNativeApp()) return
    setNativeMode(true)

    const openLogger = () => setOpen(true)
    window.addEventListener('libertylift:open-log', openLogger)
    if (new URLSearchParams(window.location.search).get('log') === '1') {
      setOpen(true)
      window.history.replaceState(window.history.state, '', '/dashboard')
    }

    return () => {
      window.removeEventListener('libertylift:open-log', openLogger)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter(element => !element.hasAttribute('hidden'))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 280)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  return { nativeMode, open, setOpen, sheetRef, inputRef }
}
