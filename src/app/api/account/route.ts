import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const admin = createAdminClient()

  if (!url || !anonKey || !admin) {
    return NextResponse.json(
      { error: 'Account deletion is not configured.' },
      { status: 503 }
    )
  }

  let confirmation: unknown
  try {
    confirmation = (await request.json()).confirmation
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (confirmation !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account deletion.' },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: 'libertylift-auth' },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  // Validate the cookie-backed session with Auth before choosing which user
  // the server-only admin client is allowed to remove.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Sign in again to delete your account.' }, { status: 401 })
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('Account deletion failed:', deleteError)
    return NextResponse.json(
      { error: 'We could not delete your account. Please try again.' },
      { status: 500 }
    )
  }

  const response = NextResponse.json({ deleted: true })
  response.headers.set('Cache-Control', 'private, no-store')
  cookieStore.getAll().forEach(({ name }) => {
    if (name.startsWith('libertylift-auth')) {
      response.cookies.set(name, '', { expires: new Date(0), path: '/' })
    }
  })

  return response
}
