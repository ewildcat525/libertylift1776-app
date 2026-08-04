export const dynamic = 'force-dynamic'

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim()

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
