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
            components: [{ '/': '/*' }],
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
