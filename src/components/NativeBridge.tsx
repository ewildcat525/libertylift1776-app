'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isHallOpen, postAuthLanding } from '@/lib/dates'
import { isNativeApp } from '@/lib/native-auth'

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
    if (!isNativeApp()) return

    let cancelled = false
    const removers: Array<() => Promise<void>> = []
    const handledAuthCodes = new Set<string>()
    const originalShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share')

    const registerRemover = async (remove: () => Promise<void>) => {
      if (cancelled) {
        await remove().catch(() => undefined)
      } else {
        removers.push(remove)
      }
    }

    const handleIncomingUrl = async (url: string) => {
      const route = routeFromAppUrl(url)
      if (!route) return

      if (route.startsWith('/auth/callback')) {
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

        // Capacitor can deliver the same cold-launch URL through both APIs.
        // PKCE codes are single-use, so exchange each one at most once.
        if (handledAuthCodes.has(code)) return
        handledAuthCodes.add(code)

        const { error } = await createClient().auth.exchangeCodeForSession(code)
        router.replace(error ? '/login?error=auth' : safeAuthDestination(incomingUrl))
        return
      }

      router.push(route)
    }

    const configureDeepLinks = async () => {
      try {
        const { App } = await import('@capacitor/app')
        if (cancelled) return

        const linkHandle = await App.addListener('appUrlOpen', ({ url }) => {
          void handleIncomingUrl(url)
        })
        await registerRemover(() => linkHandle.remove())

        // appUrlOpen covers a running app. getLaunchUrl covers the same link
        // when iOS cold-launched the process, which is common for email auth.
        const launchUrl = await App.getLaunchUrl().catch(() => undefined)
        if (!cancelled && launchUrl?.url) await handleIncomingUrl(launchUrl.url)
      } catch (error) {
        console.error('Native link handling could not be initialized.', error)
      }
    }

    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (cancelled) return
        await StatusBar.setOverlaysWebView({ overlay: false })
        // Capacitor's Style.Dark means light glyphs for a dark background.
        await StatusBar.setStyle({ style: Style.Dark })
      } catch (error) {
        console.warn('Native status bar could not be configured.', error)
      }
    }

    const hideLaunchScreen = async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        if (!cancelled) await SplashScreen.hide()
      } catch (error) {
        console.warn('Native launch screen could not be dismissed.', error)
      }
    }

    const configureShare = async () => {
      try {
        const { Share } = await import('@capacitor/share')
        if (cancelled) return
        Object.defineProperty(navigator, 'share', {
          configurable: true,
          value: async ({ title, text, url }: ShareData) => {
            await Share.share({ title, text, url, dialogTitle: title })
          },
        })
      } catch (error) {
        console.warn('Native sharing could not be configured.', error)
      }
    }

    const configureKeyboard = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard')
        if (cancelled) return

        const showHandle = await Keyboard.addListener('keyboardWillShow', () => {
          document.documentElement.classList.add('native-keyboard-open')
        })
        await registerRemover(() => showHandle.remove())

        const hideHandle = await Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.classList.remove('native-keyboard-open')
        })
        await registerRemover(() => hideHandle.remove())
      } catch (error) {
        console.warn('Native keyboard handling could not be initialized.', error)
      }
    }

    // Authentication links are critical and initialize independently. Optional
    // presentation integrations must never prevent them from being registered.
    void configureDeepLinks()
    void hideLaunchScreen()
    void configureStatusBar()
    void configureShare()
    void configureKeyboard()

    return () => {
      cancelled = true
      document.documentElement.classList.remove('native-keyboard-open')
      if (originalShareDescriptor) {
        Object.defineProperty(navigator, 'share', originalShareDescriptor)
      } else {
        delete (navigator as { share?: typeof navigator.share }).share
      }
      void Promise.all(removers.map(remove => remove().catch(() => undefined)))
    }
  }, [router])

  return null
}
