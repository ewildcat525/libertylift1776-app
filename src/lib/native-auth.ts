import { Capacitor } from '@capacitor/core'

export const isNativeApp = () => Capacitor.isNativePlatform()
  || (typeof window !== 'undefined' && Boolean((window as typeof window & { __LIBERTY_LIFT_NATIVE__?: boolean }).__LIBERTY_LIFT_NATIVE__))
  || (typeof navigator !== 'undefined' && navigator.userAgent.includes('LibertyLiftNative/'))

export function nativeAuthRedirect(webRedirect: string | undefined) {
  if (!webRedirect || !isNativeApp()) return webRedirect

  const webUrl = new URL(webRedirect)
  // Supabase redirects OAuth providers to an HTTPS URL more reliably than it
  // redirects them straight to a custom scheme. Mark the existing, allowlisted
  // web callback as a native handoff. It sends the untouched PKCE code to the
  // app, where the verifier was originally stored in WKWebView.
  webUrl.searchParams.set('native', '1')
  return webUrl.toString()
}

export async function openNativeOAuth(url: string) {
  const { Browser } = await import('@capacitor/browser')
  await Browser.open({
    url,
    presentationStyle: 'popover',
    toolbarColor: '#10100F',
  })
}

export async function nativeRepLoggedFeedback() {
  if (!isNativeApp()) return
  const { Haptics, NotificationType } = await import('@capacitor/haptics')
  await Haptics.notification({ type: NotificationType.Success })
}
