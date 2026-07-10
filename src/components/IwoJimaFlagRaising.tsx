'use client'

import { useEffect, useRef, useState } from 'react'

// Old Glory, drawn to spec-ish proportions at flag scale (96x59 units).
const STRIPE_H = 59 / 13
const CANTON_W = 38
const CANTON_H = STRIPE_H * 7
// Staggered star field: enough dots to read as fifty at silhouette distance.
const STARS = Array.from({ length: 20 }, (_, i) => ({
  cx: 5 + (i % 4) * 8 + (Math.floor(i / 4) % 2 === 1 ? 4 : 0),
  cy: 5 + Math.floor(i / 4) * 5.5,
}))

// The flag ripples by animating the clip path between two wave phases (SMIL,
// so it keeps waving without JS). The pole raise and the unfurl are CSS
// keyframes in globals.css (.flag-raising-pole / .flag-raising-flag).
const WAVE_A = 'M0,0 C24,-5 60,5 96,-2 L96,56 C60,63 24,53 0,58 Z'
const WAVE_B = 'M0,0 C24,5 60,-5 96,4 L96,60 C60,53 24,63 0,58 Z'

// How long the show runs before the parent unmounts us (matches the
// flagRaisingScene keyframes), and the shorter reduced-motion fade.
const SHOW_MS = 9200
const REDUCED_MS = 5000

interface IwoJimaFlagRaisingProps {
  /** Called once the flag has flown and the scene has faded out. */
  onDone: () => void
  title?: string
  subtitle?: string
}

/**
 * The 177,600 milestone celebration: a stylized silhouette of the flag
 * raising on Mount Suribachi, in the spirit of the Marine Corps War
 * Memorial. Six patriots walk the pole up from lowered to vertical against
 * a dawn sky, then Old Glory unfurls and waves. Replaces the usual
 * fireworks for the summit milestone only.
 */
export default function IwoJimaFlagRaising({
  onDone,
  title = '🇺🇸 THE FLAG IS UP 🇺🇸',
  subtitle = 'Raised together, rep by rep',
}: IwoJimaFlagRaisingProps) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    // Reduced motion: globals.css swaps the raise for a static raised pose
    // with a gentle fade; we just cut the run time to match.
    const timer = setTimeout(() => onDoneRef.current(), reducedMotion ? REDUCED_MS : SHOW_MS)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flag-raising-scene" aria-hidden="true">
      <svg
        className="w-full h-full block"
        viewBox="0 0 1000 640"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          <linearGradient id="ij-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#070b1c" />
            <stop offset="0.45" stopColor="#141a3c" />
            <stop offset="0.7" stopColor="#3d2a55" />
            <stop offset="0.9" stopColor="#8a4a52" />
            <stop offset="1" stopColor="#c97b45" />
          </linearGradient>
          <radialGradient id="ij-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#e8955f" stopOpacity="0.28" />
            <stop offset="1" stopColor="#e8955f" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ij-flagclip">
            <path d={WAVE_A}>
              {!reducedMotion && (
                <animate
                  attributeName="d"
                  dur="1.4s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
                  values={`${WAVE_A}; ${WAVE_B}; ${WAVE_A}`}
                />
              )}
            </path>
          </clipPath>
        </defs>

        {/* Dawn sky over the Pacific */}
        <rect x="0" y="0" width="1000" height="640" fill="url(#ij-sky)" />

        {/* Last stars of the night */}
        <g fill="#ffffff">
          <circle cx="120" cy="80" r="1.6" opacity="0.7" />
          <circle cx="300" cy="50" r="1.2" opacity="0.5" />
          <circle cx="520" cy="90" r="1.4" opacity="0.6" />
          <circle cx="760" cy="60" r="1.6" opacity="0.7" />
          <circle cx="880" cy="140" r="1.2" opacity="0.5" />
          <circle cx="210" cy="160" r="1.1" opacity="0.4" />
          <circle cx="660" cy="150" r="1.1" opacity="0.4" />
        </g>

        {/* Everything anchored to the summit shifts left on portrait screens
            (see .flag-raising-action in globals.css) so the pole and flag
            stay in frame; the terrain paths run past the viewBox edges to
            cover the shift. */}
        <g className="flag-raising-action">
        {/* Sunrise glow behind the summit */}
        <ellipse cx="590" cy="380" rx="420" ry="230" fill="url(#ij-glow)" />

        {/* Distant ridge */}
        <path
          d="M-120,640 L-120,568 L0,560 C140,540 260,520 380,505 C520,488 700,492 830,510 C900,520 960,532 1000,540 L1120,556 L1120,640 Z"
          fill="#11162b"
        />

        {/* Mount Suribachi */}
        <path
          d="M-120,640 L-120,552 L0,540 C110,522 210,478 320,436 C390,410 445,378 472,364 L500,358 L700,354 C745,357 800,382 862,420 C920,456 968,498 1000,514 L1120,530 L1120,640 Z"
          fill="#0a0e1c"
        />

        {/* Rubble on the summit */}
        <g fill="#060a16">
          <ellipse cx="470" cy="366" rx="26" ry="7" />
          <ellipse cx="676" cy="360" rx="30" ry="8" />
          <ellipse cx="712" cy="368" rx="18" ry="6" />
          <path d="M448,370 L460,358 L478,368 Z" />
          <path d="M688,362 L698,352 L714,362 Z" />
        </g>

        {/* Pole + Old Glory: rotates up from -58° about the base at (640,358) */}
        <g className="flag-raising-pole">
          <line
            x1="640"
            y1="358"
            x2="640"
            y2="146"
            stroke="#d8d3c4"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g transform="translate(643, 150)">
            <g className="flag-raising-flag">
              <g clipPath="url(#ij-flagclip)">
                {Array.from({ length: 13 }, (_, i) => (
                  <rect
                    key={i}
                    x="0"
                    y={i * STRIPE_H}
                    width="96"
                    // The last stripe runs long so the waving clip never
                    // exposes the sky beneath it.
                    height={i === 12 ? STRIPE_H + 2 : STRIPE_H + 0.4}
                    fill={i % 2 === 0 ? '#B22234' : '#f4f1e8'}
                  />
                ))}
                <rect x="0" y="0" width={CANTON_W} height={CANTON_H} fill="#3C3B6E" />
                <g fill="#f4f1e8">
                  {STARS.map((s, i) => (
                    <circle key={i} cx={s.cx} cy={s.cy} r="1.4" />
                  ))}
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Six patriots walking the pole up: hands land along its lowered
            line, from the reaching figure at the tip down to the one
            planting the base. */}
        <g stroke="#060a16" fill="#060a16" strokeLinecap="round" strokeLinejoin="round">
          <g opacity="0.92">
            <polyline points="490,364 498,344 500,324" strokeWidth="9" fill="none" />
            <polyline points="505,364 505.5,344 500,324" strokeWidth="9" fill="none" />
            <line x1="500" y1="324" x2="492" y2="288" strokeWidth="15" />
            <line x1="494" y1="290" x2="468.7" y2="251" strokeWidth="8" />
            <circle cx="488" cy="277" r="7" />
          </g>
          <g>
            <polyline points="515,362 523.5,342 526,322" strokeWidth="9" fill="none" />
            <polyline points="533,362 532.5,342 526,322" strokeWidth="9" fill="none" />
            <line x1="526" y1="322" x2="515" y2="288" strokeWidth="15" />
            <line x1="517" y1="290" x2="494.1" y2="266.9" strokeWidth="8" />
            <line x1="517" y1="290" x2="504.3" y2="273.2" strokeWidth="8" />
            <circle cx="511" cy="276.5" r="7.5" />
          </g>
          <g>
            <polyline points="546,362 554.5,343 557,324" strokeWidth="9" fill="none" />
            <polyline points="565,362 564,343 557,324" strokeWidth="9" fill="none" />
            <line x1="557" y1="324" x2="545" y2="291" strokeWidth="15" />
            <line x1="547" y1="293" x2="521.3" y2="283.8" strokeWidth="8" />
            <line x1="547" y1="293" x2="531.4" y2="290.2" strokeWidth="8" />
            <circle cx="541" cy="279.5" r="7.5" />
          </g>
          <g>
            <polyline points="575,361 583.5,342 586,323" strokeWidth="9" fill="none" />
            <polyline points="595,361 593.5,342 586,323" strokeWidth="9" fill="none" />
            <line x1="586" y1="323" x2="571" y2="293" strokeWidth="15" />
            <line x1="573" y1="295" x2="556.9" y2="306.1" strokeWidth="8" />
            <line x1="573" y1="295" x2="567.1" y2="312.4" strokeWidth="8" />
            <circle cx="567" cy="281.5" r="7.5" />
          </g>
          <g>
            <polyline points="604,360 611.5,345.5 613,331" strokeWidth="9" fill="none" />
            <polyline points="626,360 622.5,345.5 613,331" strokeWidth="9" fill="none" />
            <line x1="613" y1="331" x2="597" y2="307" strokeWidth="15" />
            <line x1="599" y1="309" x2="590.8" y2="327.3" strokeWidth="8" />
            <line x1="599" y1="309" x2="601" y2="333.6" strokeWidth="8" />
            <circle cx="593" cy="296" r="7" />
          </g>
          <g>
            <polyline points="633,359 641,343 643,327" strokeWidth="9" fill="none" />
            <polyline points="651,359 650,343 643,327" strokeWidth="9" fill="none" />
            <line x1="643" y1="327" x2="627" y2="307" strokeWidth="15" />
            <line x1="629" y1="309" x2="619.6" y2="345.3" strokeWidth="8" />
            <circle cx="623" cy="296" r="7" />
          </g>
        </g>
        </g>
      </svg>

      {/* Headline sits in the sky on landscape; on portrait the flag needs
          that space, so it drops to the dark mountainside below the scene. */}
      <div className="absolute inset-x-0 top-[7%] portrait:top-auto portrait:bottom-[14%] flex justify-center px-4">
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
