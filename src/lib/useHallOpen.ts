'use client'

import { useEffect, useState } from 'react'
import { isHallOpen, msUntilClosingBell } from '@/lib/dates'

const MAX_TIMEOUT_MS = 2_147_483_647

// Client clock for the one national Hall opening. The recursive timeout also
// handles visitors who leave a tab open well before the browser's max timeout.
export function useHallOpen() {
  const [hallOpen, setHallOpen] = useState<boolean | null>(null)

  useEffect(() => {
    let timer: number | undefined

    const sync = () => {
      const open = isHallOpen()
      setHallOpen(open)
      if (!open) {
        timer = window.setTimeout(
          sync,
          Math.min(msUntilClosingBell() + 25, MAX_TIMEOUT_MS)
        )
      }
    }

    sync()
    return () => window.clearTimeout(timer)
  }, [])

  return hallOpen
}
