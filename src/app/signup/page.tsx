import { redirect } from 'next/navigation'
import { isHallOpen } from '@/lib/dates'
import SignupForm from './SignupForm'

// The bell is an absolute instant, so this decision is the same on the server
// as in the browser — but it changes while the deployment sits there, and a
// prerendered /signup would freeze whichever side of the bell the build ran
// on. Render per request so the guard is evaluated against the clock rather
// than against build time.
export const dynamic = 'force-dynamic'

export default function SignupPage() {
  // Once the closing bell rings, new accounts wait for the next season. This
  // route-level guard also catches old bookmarks and stale external links.
  // Redirecting on the server means the browser gets a real Location header
  // instead of a form that flashes and then navigates away under the visitor.
  if (isHallOpen()) {
    redirect('/finale#next-year')
  }

  return <SignupForm />
}
