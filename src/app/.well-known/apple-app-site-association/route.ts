export const dynamic = 'force-dynamic'

// Apple Team IDs are public identifiers embedded in signing certificates and
// association files. Keep the production value as a safe default so a missing
// deployment variable cannot silently disable every universal link.
const PRODUCTION_APPLE_TEAM_ID = '5Y6982PX8P'

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim() || PRODUCTION_APPLE_TEAM_ID

  if (!teamId || !/^[A-Z0-9]{10}$/.test(teamId)) {
    return Response.json(
      { error: 'Universal links are not configured.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [`${teamId}.com.libertylift1776.app`],
            // Order matters: Apple takes the first matching component.
            //
            // The auth routes are deliberately excluded. Native sign-in hands
            // the PKCE code back through the libertylift1776:// scheme, which
            // universal links do not touch, so the app still gets its code. A
            // plain HTTPS auth link, though, belongs to whichever browser
            // requested it — that is where the PKCE verifier lives. Letting
            // iOS hijack such a tap into the app would run the exchange in a
            // WKWebView that never stored the verifier, and sign-in fails.
            //
            // API routes are excluded because they are machine endpoints:
            // unsubscribe links and cron callbacks should answer as HTTP, not
            // launch an app screen that cannot render them.
            components: [
              { '/': '/auth/*', exclude: true },
              { '/': '/api/*', exclude: true },
              { '/': '/*' },
            ],
          },
        ],
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json',
      },
    }
  )
}
