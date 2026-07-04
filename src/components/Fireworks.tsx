'use client'

import { useEffect, useRef, useState } from 'react'

// Red, white, blue, and gold — flag colors with extra shimmer.
const PALETTES = [
  ['#FF4D5E', '#FF6B7A', '#FFD3D8'], // red
  ['#FFFFFF', '#EBE7DC', '#C8D7FF'], // white
  ['#5B7BFF', '#7C96FF', '#B7C6FF'], // blue
  ['#FFD447', '#FFC22E', '#FFE9A8'], // gold
]

type ShellType = 'peony' | 'ring' | 'willow' | 'crossette'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  px: number
  py: number
  life: number
  decay: number
  color: string
  gravity: number
  friction: number
  flicker: boolean
  splits: boolean
}

interface Rocket {
  x: number
  y: number
  vx: number
  vy: number
  px: number
  py: number
  targetY: number
  palette: string[]
  type: ShellType
}

interface FireworksProps {
  /** Called once the show wraps up so the parent can unmount us. */
  onDone: () => void
  /** Banner text; defaults to the July 4th easter egg. */
  title?: string
  subtitle?: string
}

export default function Fireworks({
  onDone,
  title = '🇺🇸 HAPPY FOURTH 🇺🇸',
  subtitle = 'Reps for the Republic',
}: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    // Respect reduced motion: banner only, no pyrotechnics.
    if (reducedMotion) {
      const timer = setTimeout(() => onDoneRef.current(), 4000)
      return () => clearTimeout(timer)
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []
    const particles: Particle[] = []
    const rand = (min: number, max: number) => min + Math.random() * (max - min)
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

    const W = () => window.innerWidth
    const H = () => window.innerHeight

    const launch = (type?: ShellType) => {
      const x = rand(W() * 0.15, W() * 0.85)
      rockets.push({
        x,
        y: H() + 10,
        px: x,
        py: H() + 10,
        vx: rand(-0.8, 0.8),
        vy: rand(-15.5, -12.5) * (H() / 800),
        targetY: rand(H() * 0.12, H() * 0.42),
        palette: pick(PALETTES),
        type: type ?? pick(['peony', 'peony', 'ring', 'willow', 'crossette'] as ShellType[]),
      })
    }

    const spawnParticle = (
      x: number,
      y: number,
      angle: number,
      speed: number,
      color: string,
      overrides: Partial<Particle> = {}
    ): Particle => ({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: rand(0.009, 0.015),
      color,
      gravity: 0.045,
      friction: 0.985,
      flicker: false,
      splits: false,
      ...overrides,
    })

    const explode = (rocket: Rocket) => {
      const { x, y, palette, type } = rocket
      const scale = Math.min(W(), 900) / 900

      if (type === 'ring') {
        const count = 64
        const tilt = rand(0, Math.PI)
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2
          particles.push(
            spawnParticle(x, y, angle + tilt, 6.5 * scale, pick(palette), {
              decay: rand(0.011, 0.016),
            })
          )
        }
      } else if (type === 'willow') {
        const count = 90
        for (let i = 0; i < count; i++) {
          particles.push(
            spawnParticle(x, y, rand(0, Math.PI * 2), rand(1, 7) * scale, pick(['#FFD447', '#FFC22E', '#FFE9A8']), {
              gravity: 0.028,
              friction: 0.992,
              decay: rand(0.005, 0.009),
              flicker: true,
            })
          )
        }
      } else if (type === 'crossette') {
        const count = 24
        for (let i = 0; i < count; i++) {
          particles.push(
            spawnParticle(x, y, rand(0, Math.PI * 2), rand(3, 8) * scale, pick(palette), {
              splits: true,
              decay: rand(0.018, 0.026),
            })
          )
        }
      } else {
        // peony: classic full sphere
        const count = 110
        for (let i = 0; i < count; i++) {
          particles.push(
            spawnParticle(x, y, rand(0, Math.PI * 2), rand(2, 8.5) * scale, pick(palette), {
              flicker: Math.random() < 0.3,
            })
          )
        }
      }
    }

    // The show: staggered single launches, then a grand finale volley.
    const timers: ReturnType<typeof setTimeout>[] = []
    const schedule: number[] = [0, 500, 1100, 1600, 2300, 2900, 3500]
    schedule.forEach(t => timers.push(setTimeout(() => launch(), t)))
    // Finale: a tight volley of five
    for (let i = 0; i < 5; i++) {
      timers.push(setTimeout(() => launch(), 4300 + i * 180))
    }

    let curtainCall = false
    timers.push(setTimeout(() => { curtainCall = true }, 5500))

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, W(), H())
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'

      // Rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.px = r.x
        r.py = r.y
        r.x += r.vx
        r.y += r.vy
        r.vy += 0.18

        ctx.strokeStyle = 'rgba(255, 220, 160, 0.9)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(r.px, r.py)
        ctx.lineTo(r.x, r.y)
        ctx.stroke()

        if (r.y <= r.targetY || r.vy >= -2) {
          rockets.splice(i, 1)
          explode(r)
        }
      }

      // Burst particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.px = p.x
        p.py = p.y
        p.vx *= p.friction
        p.vy *= p.friction
        p.vy += p.gravity
        p.x += p.vx
        p.y += p.vy
        p.life -= p.decay

        if (p.splits && p.life < 0.55) {
          p.splits = false
          for (let j = 0; j < 4; j++) {
            particles.push(
              spawnParticle(p.x, p.y, rand(0, Math.PI * 2), rand(1.5, 3), p.color, {
                life: 0.6,
                decay: rand(0.02, 0.03),
              })
            )
          }
        }

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        const alpha = p.flicker && Math.random() < 0.25 ? p.life * 0.4 : p.life
        ctx.strokeStyle = p.color
        ctx.beginPath()
        ctx.moveTo(p.px, p.py)
        ctx.lineTo(p.x, p.y)
        // Soft glow pass, then a bright core on top
        ctx.globalAlpha = Math.max(alpha * 0.35, 0)
        ctx.lineWidth = 7
        ctx.stroke()
        ctx.globalAlpha = Math.max(alpha, 0)
        ctx.lineWidth = 3
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      if (curtainCall && rockets.length === 0 && particles.length === 0) {
        onDoneRef.current()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true">
      {!reducedMotion && <canvas ref={canvasRef} className="w-full h-full" />}
      <div className="absolute inset-x-0 top-[18%] flex justify-center px-4">
        <div className="fireworks-banner text-center">
          <div className="font-bebas text-5xl sm:text-7xl text-white drop-shadow-[0_0_25px_rgba(255,212,71,0.6)]">
            {title}
          </div>
          <div className="mt-1 text-sm sm:text-base uppercase tracking-[0.3em] text-liberty-gold font-bold">
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  )
}
