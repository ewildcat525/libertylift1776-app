import { ImageResponse } from 'next/og'
import { fetchContestInvitePreview } from '@/lib/public-data'

export const runtime = 'edge'
export const alt = 'You have been challenged — Liberty Lift 1776'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { code: string } }) {
  let code = params.code
  try {
    code = decodeURIComponent(params.code)
  } catch {
    // keep raw value
  }

  const preview = await fetchContestInvitePreview(code)
  const contestName = preview?.name.slice(0, 60)

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0A0A0F 0%, #0F0F18 50%, #0A0A0F 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 80, borderTop: '5px solid #B22234', borderLeft: '5px solid #B22234' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderTop: '5px solid #3C3B6E', borderRight: '5px solid #3C3B6E' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 80, height: 80, borderBottom: '5px solid #3C3B6E', borderLeft: '5px solid #3C3B6E' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 80, height: 80, borderBottom: '5px solid #B22234', borderRight: '5px solid #B22234' }} />

        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: 24 }}>
          LIBERTY LIFT / 1776
        </div>

        {contestName ? (
          <>
            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.1em',
                marginBottom: 24,
              }}
            >
              YOU ARE INVITED TO
            </div>
            <div
              style={{
                fontSize: contestName.length > 24 ? 72 : 100,
                fontWeight: 900,
                lineHeight: 1.05,
                textAlign: 'center',
                maxWidth: 1000,
                background: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: 40,
              }}
            >
              {contestName.toUpperCase()}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.05,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              YOU HAVE BEEN
            </div>
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                lineHeight: 1,
                background: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                marginBottom: 40,
              }}
            >
              CHALLENGED
            </div>
          </>
        )}

        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>
          1,776 PUSH-UPS. 31 DAYS. NO SPECTATORS.
        </div>
      </div>
    ),
    { ...size }
  )
}
