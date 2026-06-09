import { ImageResponse } from 'next/og'
import { fetchProfileStatsByHandle } from '@/lib/public-data'
import { US_STATES } from '@/lib/supabase'

export const runtime = 'edge'
export const alt = 'Liberty Lift 1776 personal progress'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { handle: string } }) {
  let handle = params.handle
  try {
    handle = decodeURIComponent(params.handle)
  } catch {
    // keep raw value
  }

  const stats = await fetchProfileStatsByHandle(handle)
  const name = (stats?.display_name || handle).slice(0, 26)
  const total = stats?.total_pushups ?? 0
  const streak = stats?.current_streak ?? 0
  const rank = stats?.global_rank
  const stateName = stats?.state_code ? US_STATES[stats.state_code] : null
  const progress = Math.min(total / 1776, 1)

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

        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: 16 }}>
          LIBERTY LIFT / 1776
        </div>

        <div style={{ fontSize: 64, fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>
          {name}
        </div>

        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.6)', marginBottom: 36, display: 'flex', gap: 24 }}>
          {stateName ? <span>Team {stateName}</span> : <span>The Push-Up Challenge</span>}
          {rank ? <span>#{rank} nationally</span> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <div
            style={{
              fontSize: 150,
              fontWeight: 900,
              lineHeight: 1,
              background: 'linear-gradient(180deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {total.toLocaleString()}
          </div>
          <div style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }}>/ 1,776 push-ups</div>
        </div>

        <div
          style={{
            width: 720,
            height: 18,
            background: 'rgba(255,255,255,0.12)',
            marginTop: 32,
            marginBottom: 32,
            display: 'flex',
          }}
        >
          <div
            style={{
              width: Math.max(Math.round(progress * 720), 8),
              height: 18,
              background: 'linear-gradient(90deg, #B22234 0%, #D4AF37 100%)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 64 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#FFFFFF' }}>{streak}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>DAY STREAK</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#FFFFFF' }}>{stats?.best_day ?? 0}</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>BEST DAY</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#FFFFFF' }}>JULY 2026</div>
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}>THINK YOU CAN KEEP UP?</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
