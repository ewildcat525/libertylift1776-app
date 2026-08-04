'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase'
import { isHallOpen, postAuthLanding } from '@/lib/dates'

const WEB_HOSTS = new Set(['libertylift1776.com', 'www.libertylift1776.com'])

function routeFromAppUrl(value: string): string | null {
  try {
    const url = new URL(value)

    if (url.protocol === 'https:' && WEB_HOSTS.has(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}`
    }

    if (url.protocol === 'libertylift1776:') {
      const hostPath = url.hostname && url.hostname !== 'open' ? `/${url.hostname}` : ''
      const path = url.pathname === '/' ? '' : url.pathname
      return `${hostPath}${path}${url.search}${url.hash}` || '/dashboard'
    }
  } catch {
    // Ignore malformed links delivered by the operating system.
  }

  return null
}

function safeAuthDestination(url: URL) {
  if (url.searchParams.get('intent') === 'login' && isHallOpen()) return '/finale'
  const next = url.searchParams.get('next')
  return next?.startsWith('/') && !next.startsWith('//') ? next : postAuthLanding()
}

export default function NativeBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    const removers: Array<() => Promise<void>> = []
    const handledAuthCodes = new Set<string>()

    void Promise.all([
      import('@capacitor/app'),
      import('@capacitor/keyboard'),
      import('@capacitor/share'),
      import('@capacitor/status-bar'),
    ]).then(async ([{ App }, { Keyboard }, { Share }, { StatusBar, Style }]) => {
      if (cancelled) return

      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.setStyle({ style: Style.Dark })

      // Existing share buttons use Web Share. Bridge them to the native iOS
      // activity sheet so their behavior is consistent across WKWebView versions.
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async ({ title, text, url }: ShareData) => {
          await Share.share({ title, text, url, dialogTitle: title })
        },
      })

      const handleIncomingUrl = async (url: string) => {
        const route = routeFromAppUrl(url)
        if (!route) return

        if (route?.startsWith('/auth/callback')) {
          const incomingUrl = new URL(url)
          await import('@capacitor/browser').then(({ Browser }) => Browser.close()).catch(() => undefined)

          const authError = incomingUrl.searchParams.get('error_code')
            || incomingUrl.searchParams.get('error')
            || incomingUrl.searchParams.get('error_description')
          if (authError) {
            router.replace(`/login?error=${encodeURIComponent(authError)}`)
            return
          }

          const code = incomingUrl.searchParams.get('code')
          if (!code) {
            router.replace('/login?error=auth')
            return
          }

          // Capacitor retains a cold-launch URL until a listener consumes it,
          // while getLaunchUrl can report that same URL too. A PKCE code is
          // single-use, so never let both delivery paths exchange it.
          if (handledAuthCodes.has(code)) return
          handledAuthCodes.add(code)

          const { error } = await createClient().auth.exchangeCodeForSession(code)
          router.replace(error ? '/login?error=auth' : safeAuthDestination(incomingUrl))
          return
        }

        router.push(route)
      }

      const linkHandle = await App.addListener('appUrlOpen', ({ url }) => {
        void handleIncomingUrl(url)
      })
      removers.push(() => linkHandle.remove())

      // appUrlOpen covers a running app. getLaunchUrl covers the same link
      // when iOS had to cold-launch the process (common for email sign-in).
      const launchUrl = await App.getLaunchUrl()
      if (launchUrl?.url) await handleIncomingUrl(launchUrl.url)

      const keyboardHandle = await Keyboard.addListener('keyboardWillShow', () => {
        document.documentElement.classList.add('native-keyboard-open')
      })
      removers.push(() => keyboardHandle.remove())

      const keyboardHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.classList.remove('native-keyboard-open')
      })
      removers.push(() => keyboardHideHandle.remove())
    })

    return () => {
      cancelled = true
      document.documentElement.classList.remove('native-keyboard-open')
      void Promise.all(removers.map(remove => remove()))
    }
  }, [router])

  return null
}
