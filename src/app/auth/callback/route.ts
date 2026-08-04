import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { isHallOpen, postAuthLanding } from '@/lib/dates'

const NATIVE_AUTH_CALLBACK = 'libertylift1776://auth/callback'

// postAuthLanding compares absolute instants, so it is correct here even
// though this runs on a UTC server.
function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return postAuthLanding()
  }

  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  // The OAuth browser cannot access the PKCE verifier stored by the native
  // WKWebView. Hand the untouched result back to the app before attempting a
  // server-side exchange; NativeBridge completes it in the original context.
  if (searchParams.get('native') === '1') {
    const appUrl = new URL(NATIVE_AUTH_CALLBACK)
    appUrl.search = searchParams.toString()
    return NextResponse.redirect(appUrl, {
      status: 302,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const code = searchParams.get('code')
  // intent=login marks a link whose ?next is only the campaign landing that /login
  // guessed when the link was minted — never a destination the patriot picked. That
  // is the one case safe to re-resolve here, so a magic link requested minutes before
  // the closing bell and opened after it still lands in the Hall. Sign-ins carrying
  // their own ?next (a squad invite, a contest) omit intent and are honored verbatim.
  const returningLogin = searchParams.get('intent') === 'login'
  const next = returningLogin && isHallOpen()
    ? '/finale'
    : getSafeNext(searchParams.get('next'))

  if (code) {
    const cookieStore = await cookies()
    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []
    const responseHeaders = new Headers()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: 'libertylift-auth',
        },
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach((cookie) => {
              pendingCookies.push(cookie)
            })
            Object.entries(headers).forEach(([key, value]) => {
              responseHeaders.set(key, value)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      responseHeaders.forEach((value, key) => {
        response.headers.set(key, value)
      })
      return response
    }
  }

  // Return to login on error, keeping Supabase's error code (e.g. otp_expired)
  // so the login page can explain what went wrong
  const errorCode = searchParams.get('error_code')
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorCode || 'auth')}`)
}
