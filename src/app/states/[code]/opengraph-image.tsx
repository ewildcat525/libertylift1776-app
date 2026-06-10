import { ImageResponse } from 'next/og'
import { fetchStateStats } from '@/lib/public-data'
import { US_STATES } from '@/lib/supabase'

export const runtime = 'edge'
export const alt = 'Liberty Lift 1776 state board'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { code: string } }) {
  const stateCode = params.code.toUpperCase()
  const stateName = US_STATES[stateCode] || stateCode
  const stats = await fetchStateStats(stateCode)

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

        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: 20 }}>
          LIBERTY LIFT / 1776
        </div>

        <div style={{ fontSize: 96, fontWeight: 900, color: '#FFFFFF', lineHeight: 1, marginBottom: 12 }}>
          {stateName.toUpperCase()}
        </div>

        {stats?.state_rank ? (
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#D4AF37',
              marginBottom: 40,
            }}
          >
            #{stats.state_rank} IN THE NATION
          </div>
        ) : (
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.6)', marginBottom: 40 }}>
            NEEDS YOU ON THE BOARD
          </div>
        )}

        <div style={{ display: 'flex', gap: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: '#FFFFFF' }}>
              {(stats?.total_pushups ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>PUSH-UPS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: '#FFFFFF' }}>
              {(stats?.participants ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>PATRIOTS</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 56, fontWeight: 900, color: '#FFFFFF' }}>JULY 2026</div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>1776 EACH</div>
          </div>
        </div>

        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.2em', marginTop: 48 }}>
          WILL YOUR STATE ANSWER?
        </div>
      </div>
    ),
    { ...size }
  )
}
