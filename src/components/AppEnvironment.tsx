'use client'

import { useEffect } from 'react'

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

type WindowWithCapacitor = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean
  }
}

/**
 * Exposes the current container as a stable HTML data attribute. This keeps
 * safe-area and installed-app styling in CSS without coupling the web app to
 * a particular native wrapper.
 */
export default function AppEnvironment() {
  useEffect(() => {
    const root = document.documentElement
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')

    const updateEnvironment = () => {
      const navigatorStandalone = (window.navigator as NavigatorWithStandalone).standalone === true
      const capacitor = (window as WindowWithCapacitor).Capacitor
      const isNative = capacitor?.isNativePlatform?.() === true
      const isStandalone = standaloneQuery.matches || navigatorStandalone

      root.dataset.appEnvironment = isNative
        ? 'native'
        : isStandalone
          ? 'standalone'
          : 'browser'
    }

    updateEnvironment()
    standaloneQuery.addEventListener?.('change', updateEnvironment)

    return () => {
      standaloneQuery.removeEventListener?.('change', updateEnvironment)
      delete root.dataset.appEnvironment
    }
  }, [])

  return null
}
