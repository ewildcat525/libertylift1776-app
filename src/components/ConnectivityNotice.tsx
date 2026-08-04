'use client'

import { useEffect, useState } from 'react'

export default function ConnectivityNotice() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="connectivity-notice" role="status" aria-live="polite">
      <span aria-hidden="true">●</span>
      You&apos;re offline. Previously loaded screens remain visible; logging and live boards need a connection.
    </div>
  )
}
