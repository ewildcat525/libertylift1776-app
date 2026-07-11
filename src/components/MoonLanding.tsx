'use client'

import { useEffect, useRef, useState } from 'react'

// Deterministic star field (no Math.random — keeps server and client
// renders identical).
const SKY_STARS = Array.from({ length: 46 }, (_, i) => ({
  cx: Math.round(((i * 137.5) % 1000) * 10) / 10,
  cy: Math.round((((i * 89.7) % 320) + 10) * 10) / 10,
  r: 0.7 + ((i * 7) % 12) / 10,
  o: 0.3 + ((i * 13) % 55) / 100,
}))

// The lunar flag hangs from a horizontal crossbar and keeps a frozen
// ripple — the SMIL loop below just breathes that ripple slightly.
const FLAG_W = 70
const FLAG_H = 44
const WAVE_A = `M0,0 L${FLAG_W},0 L${FLAG_W},${FLAG_H - 2} C${FLAG_W * 0.65},${FLAG_H + 3} ${FLAG_W * 0.3},${FLAG_H - 4} 0,${FLAG_H} Z`
const WAVE_B = `M0,0 L${FLAG_W},0 L${FLAG_W},${FLAG_H + 1} C${FLAG_W * 0.65},${FLAG_H - 4} ${FLAG_W * 0.3},${FLAG_H + 3} 0,${FLAG_H} Z`
const STRIPE_H = FLAG_H / 13
const CANTON_W = 28
const CANTON_H = STRIPE_H * 7
const CANTON_STARS = Array.from({ length: 12 }, (_, i) => ({
  cx: 4 + (i % 3) * 8 + (Math.floor(i / 3) % 2 === 1 ? 4 : 0),
  cy: 4 + Math.floor(i / 3) * 5,
}))

// Show length (matches the moonLandingScene keyframes) and the shorter
// reduced-motion fade.
const SHOW_MS = 9200
const REDUCED_MS = 5000

interface MoonLandingProps {
  /** Called once the flag is planted and the scene has faded out. */
  onDone: () => void
  title?: string
  subtitle?: string
}

/**
 * The 239,000 milestone celebration: one push-up for every mile to the
 * moon. A lone astronaut beside the lunar module tilts the pole upright,
 * then Old Glory telescopes out along its crossbar — stiff and rippled,
 * like the real one. Earth watches from the black sky.
 */
export default function MoonLanding({
  onDone,
  title = '🌕 THE EAGLE HAS LANDED 🌕',
  subtitle = 'One mile per rep, all the way to the moon',
}: MoonLandingProps) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    // Reduced motion: globals.css swaps the plant for the finished pose
    // with a gentle fade; we just cut the run time to match.
    const timer = setTimeout(() => onDoneRef.current(), reducedMotion ? REDUCED_MS : SHOW_MS)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none moon-landing-scene" aria-hidden="true">
      <svg
        className="w-full h-full block"
        viewBox="0 0 1000 640"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="ml-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#020308" />
            <stop offset="0.75" stopColor="#05070f" />
            <stop offset="1" stopColor="#0a0c16" />
          </linearGradient>
          <linearGradient id="ml-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#585c68" />
            <stop offset="0.5" stopColor="#484c58" />
            <stop offset="1" stopColor="#33363f" />
          </linearGradient>
          <radialGradient id="ml-earthglow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#6fa8ff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#6fa8ff" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ml-flagclip">
            <path d={WAVE_A}>
              {!reducedMotion && (
                <animate
                  attributeName="d"
                  dur="2.2s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
                  values={`${WAVE_A}; ${WAVE_B}; ${WAVE_A}`}
                />
              )}
            </path>
          </clipPath>
          <clipPath id="ml-earthclip">
            <circle cx="230" cy="112" r="34" />
          </clipPath>
        </defs>

        {/* The void */}
        <rect x="0" y="0" width="1000" height="640" fill="url(#ml-sky)" />
        <g fill="#ffffff">
          {SKY_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} opacity={s.o} />
          ))}
        </g>

        {/* Earth, a quarter million miles from home */}
        <circle cx="230" cy="112" r="52" fill="url(#ml-earthglow)" />
        <circle cx="230" cy="112" r="34" fill="#2f5fbe" />
        <g clipPath="url(#ml-earthclip)">
          <path d="M196,102 C210,94 224,100 236,94 C248,88 258,92 266,100 L266,78 L196,78 Z" fill="#e8eef7" opacity="0.85" />
          <path d="M200,124 C214,118 228,126 242,120 C252,116 260,120 266,126 L266,136 C250,142 214,140 196,132 Z" fill="#e8eef7" opacity="0.7" />
          <path d="M212,104 C220,108 230,106 236,112 C230,118 218,116 210,112 Z" fill="#3f8f5a" opacity="0.9" />
          {/* Night-side terminator */}
          <path d="M242,78 A34,34 0 0 1 242,146 A44,44 0 0 0 242,78 Z" fill="#020308" opacity="0.55" />
        </g>

        {/* Everything on the surface shifts left on portrait screens (see
            .moon-landing-action in globals.css) so the lander stays in
            frame; the terrain runs past the viewBox edges to cover it. */}
        <g className="moon-landing-action">
          {/* Mare, with a brighter horizon line where the sun grazes it */}
          <path
            d="M-120,640 L-120,436 C40,424 180,442 340,432 C500,422 660,440 810,430 C920,424 1060,436 1120,430 L1120,640 Z"
            fill="url(#ml-ground)"
          />
          <path
            d="M-120,436 C40,424 180,442 340,432 C500,422 660,440 810,430 C920,424 1060,436 1120,430"
            fill="none"
            stroke="#7c818f"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Craters and scattered regolith */}
          <g fill="#2c2f38" opacity="0.55">
            <ellipse cx="180" cy="480" rx="52" ry="12" />
            <ellipse cx="420" cy="520" rx="34" ry="9" />
            <ellipse cx="900" cy="500" rx="60" ry="13" />
            <ellipse cx="660" cy="560" rx="44" ry="11" />
            <ellipse cx="80" cy="590" rx="38" ry="10" />
          </g>
          <g fill="#6b7080" opacity="0.5">
            <ellipse cx="180" cy="477" rx="52" ry="10" />
            <ellipse cx="420" cy="517" rx="34" ry="7" />
            <ellipse cx="900" cy="497" rx="60" ry="11" />
            <ellipse cx="660" cy="557" rx="44" ry="9" />
            <ellipse cx="80" cy="587" rx="38" ry="8" />
          </g>

          {/* Bootprints between the lander and the flag */}
          <g fill="#2c2f38" opacity="0.6">
            <ellipse cx="640" cy="446" rx="7" ry="2.5" />
            <ellipse cx="622" cy="452" rx="7" ry="2.5" />
            <ellipse cx="604" cy="447" rx="7" ry="2.5" />
          </g>

          {/* The Eagle: gray ascent stage over the gold-mylar descent stage,
              dimly sunlit so it reads against the black sky */}
          <g>
            {/* Ascent stage + hatch band and antenna */}
            <path d="M736,336 L784,336 L792,352 L792,370 L728,370 L728,352 Z" fill="#2c313f" />
            <path d="M736,336 L784,336 L788,344 L732,344 Z" fill="#3d4354" />
            <rect x="726" y="370" width="68" height="6" fill="#232734" />
            <line x1="760" y1="336" x2="760" y2="310" stroke="#2c313f" strokeWidth="2.5" />
            <circle cx="760" cy="308" r="3.5" fill="#2c313f" />
            {/* Descent stage in mylar foil */}
            <path d="M716,376 L804,376 L812,398 L812,412 L708,412 L708,398 Z" fill="#6e5b28" />
            <path d="M716,376 L804,376 L807,384 L713,384 Z" fill="#8a7434" />
            {/* Legs and footpads */}
            <g fill="#232734">
              <line x1="716" y1="400" x2="686" y2="438" stroke="#232734" strokeWidth="5" strokeLinecap="round" />
              <line x1="804" y1="400" x2="834" y2="438" stroke="#232734" strokeWidth="5" strokeLinecap="round" />
              <line x1="730" y1="412" x2="716" y2="438" stroke="#232734" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="686" cy="440" rx="12" ry="4" />
              <ellipse cx="834" cy="440" rx="12" ry="4" />
              <ellipse cx="716" cy="440" rx="9" ry="3.5" />
            </g>
            {/* Engine bell */}
            <path d="M748,412 L772,412 L778,426 L742,426 Z" fill="#1a1d28" />
          </g>

          {/* Pole + Old Glory: tilts up from -30° about the base, then the
              flag telescopes out along its crossbar */}
          <g className="moon-landing-pole">
            <line
              x1="588"
              y1="444"
              x2="588"
              y2="298"
              stroke="#d8d3c4"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <g transform="translate(590, 300)">
              <g className="moon-landing-flag">
                {/* Crossbar the flag hangs from */}
                <line x1="0" y1="0" x2={FLAG_W} y2="0" stroke="#d8d3c4" strokeWidth="2.5" strokeLinecap="round" />
                <g transform="translate(0, 1.5)">
                  <g clipPath="url(#ml-flagclip)">
                    {Array.from({ length: 13 }, (_, i) => (
                      <rect
                        key={i}
                        x="0"
                        y={i * STRIPE_H}
                        width={FLAG_W}
                        height={i === 12 ? STRIPE_H + 4 : STRIPE_H + 0.4}
                        fill={i % 2 === 0 ? '#B22234' : '#f4f1e8'}
                      />
                    ))}
                    <rect x="0" y="0" width={CANTON_W} height={CANTON_H} fill="#3C3B6E" />
                    <g fill="#f4f1e8">
                      {CANTON_STARS.map((s, i) => (
                        <circle key={i} cx={s.cx} cy={s.cy} r="1.2" />
                      ))}
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>

          {/* The astronaut, planting it */}
          <g fill="#0d0f18" stroke="#0d0f18" strokeLinecap="round">
            {/* Life-support backpack */}
            <rect x="518" y="360" width="20" height="34" rx="4" />
            {/* Torso */}
            <rect x="532" y="358" width="26" height="40" rx="10" />
            {/* Helmet with gold visor glint */}
            <circle cx="550" cy="348" r="12.5" />
            <path d="M551,342 A9,9 0 0 1 559,351 L551,351 Z" fill="#c9a24a" stroke="none" opacity="0.9" />
            {/* Legs — one striding back toward the lander */}
            <path d="M540,396 L534,414 L528,440" fill="none" strokeWidth="10" />
            <path d="M552,396 L558,418 L562,440" fill="none" strokeWidth="10" />
            <ellipse cx="526" cy="442" rx="8" ry="3.5" stroke="none" />
            <ellipse cx="564" cy="442" rx="8" ry="3.5" stroke="none" />
            {/* Arms gripping the pole */}
            <path d="M556,366 L574,354 L586,344" fill="none" strokeWidth="9" />
            <path d="M556,376 L572,372 L585,366" fill="none" strokeWidth="9" />
          </g>
        </g>
      </svg>

      {/* Headline in the sky on landscape; on portrait it drops onto the
          dark foreground below the scene. */}
      <div className="absolute inset-x-0 top-[7%] portrait:top-auto portrait:bottom-[10%] flex justify-center px-4">
        <div className="summit-banner text-center">
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
