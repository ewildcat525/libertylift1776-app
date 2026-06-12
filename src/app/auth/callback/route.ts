import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }

  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = getSafeNext(searchParams.get('next'))

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
