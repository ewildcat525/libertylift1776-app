import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="app-surface flex min-h-[100dvh] items-center justify-center px-5 py-16 text-center">
      <div className="card w-full max-w-lg p-8 sm:p-10">
        <div className="app-eyebrow mb-3 justify-center">404 · Off the board</div>
        <h1 className="app-title text-5xl sm:text-6xl">That page moved.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/60">
          The link may be old, but the challenge is still here.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="btn-primary min-h-12 px-7">
            Open dashboard
          </Link>
          <Link href="/" className="btn-secondary min-h-12 px-7">
            Campaign home
          </Link>
        </div>
      </div>
    </main>
  )
}
