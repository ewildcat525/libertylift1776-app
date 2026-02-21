import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Liberty Lift 1776 - Complete 1776 push-ups in July'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
        {/* Red glow */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(178, 34, 52, 0.3) 0%, transparent 70%)',
          }}
        />
        {/* Blue glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(60, 59, 110, 0.3) 0%, transparent 70%)',
          }}
        />

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 80, height: 80, borderTop: '5px solid #B22234', borderLeft: '5px solid #B22234' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderTop: '5px solid #3C3B6E', borderRight: '5px solid #3C3B6E' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 80, height: 80, borderBottom: '5px solid #3C3B6E', borderLeft: '5px solid #3C3B6E' }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 80, height: 80, borderBottom: '5px solid #B22234', borderRight: '5px solid #B22234' }} />

        {/* Flag */}
        <div style={{ fontSize: 70, marginBottom: 10 }}>🇺🇸</div>

        {/* Title */}
        <div
          style={{
            fontSize: 90,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '0.05em',
            textShadow: '0 0 30px rgba(255,255,255,0.3)',
          }}
        >
          LIBERTY LIFT
        </div>

        {/* 1776 */}
        <div
          style={{
            fontSize: 180,
            fontWeight: 900,
            background: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1,
            textShadow: '0 0 60px rgba(212, 175, 55, 0.5)',
          }}
        >
          1776
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.3em',
            marginTop: 20,
            marginBottom: 40,
          }}
        >
          ONE NATION. ONE MONTH. ONE CHALLENGE.
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF' }}>1,776</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>PUSH-UPS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF' }}>31</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>DAYS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF' }}>~57</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>PER DAY</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
