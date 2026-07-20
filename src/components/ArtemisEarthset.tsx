'use client'

import { useEffect, useRef, useState } from 'react'

// Deterministic star field (no Math.random — keeps server and client
// renders identical, like the MoonLanding scene).
const SKY_STARS = Array.from({ length: 60 }, (_, i) => ({
  cx: Math.round(((i * 137.5) % 1000) * 10) / 10,
  cy: Math.round((((i * 71.3) % 400) + 6) * 10) / 10,
  r: 0.6 + ((i * 7) % 12) / 10,
  o: 0.28 + ((i * 13) % 60) / 100,
}))

// Craters scattered across the near limb of the Moon's far side.
const CRATERS = [
  { cx: 210, cy: 560, r: 46 },
  { cx: 470, cy: 610, r: 30 },
  { cx: 700, cy: 555, r: 54 },
  { cx: 860, cy: 600, r: 34 },
  { cx: 360, cy: 590, r: 22 },
  { cx: 590, cy: 560, r: 18 },
]

// Show length (matches artemisScene keyframes) and the shorter
// reduced-motion fade.
const SHOW_MS = 9200
const REDUCED_MS = 5000

interface ArtemisEarthsetProps {
  /** Called once Earth has set behind the limb and the scene has faded. */
  onDone: () => void
  title?: string
  subtitle?: string
}

// One solar-array wing extending along +x from a hub — the boom, then the
// blue cell panel with its grid. Two of these on the right; the left pair is
// a mirrored copy, so the four form Orion's distinctive X.
function Wing() {
  // Boom, then three gold-framed cell panels — Orion's arrays are three
  // segments per wing.
  return (
    <>
      <rect x="3" y="-1.4" width="11" height="2.8" fill="#8a7a3c" />
      {[14, 32, 50].map(x => (
        <g key={x}>
          <rect x={x} y="-9" width="16" height="18" fill="#1c2749" stroke="#b9902f" strokeWidth="0.9" />
          <line x1={x} y1="0" x2={x + 16} y2="0" stroke="#b9902f" strokeWidth="0.5" opacity="0.8" />
          <line x1={x + 8} y1="-9" x2={x + 8} y2="9" stroke="#3a4a7a" strokeWidth="0.5" />
        </g>
      ))}
    </>
  )
}

/**
 * The 252,757 milestone celebration: one mile farther than the Artemis II
 * crew flew from Earth in April 2026, past the farthest any human has ever
 * traveled. Orion coasts past the Moon's cratered far-side limb while a
 * crescent Earth sets behind it (the mission's iconic "Earthset").
 */
export default function ArtemisEarthset({
  onDone,
  title = '🌘 FARTHER THAN ARTEMIS II 🌘',
  subtitle = 'Farther than any human has ever traveled',
}: ArtemisEarthsetProps) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    // Reduced motion: globals.css freezes the coast and holds the composed
    // pose with a gentle fade; we just cut the run time to match.
    const timer = setTimeout(() => onDoneRef.current(), reducedMotion ? REDUCED_MS : SHOW_MS)
    return () => clearTimeout(timer)
  }, [reducedMotion])

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none artemis-scene" aria-hidden="true">
      <svg
        className="w-full h-full block"
        viewBox="0 0 1000 640"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="ar-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#010206" />
            <stop offset="0.7" stopColor="#04060e" />
            <stop offset="1" stopColor="#070a15" />
          </linearGradient>
          <radialGradient id="ar-moon" cx="0.5" cy="0.2" r="0.9">
            <stop offset="0" stopColor="#5c606c" />
            <stop offset="0.6" stopColor="#484c58" />
            <stop offset="1" stopColor="#2c2f39" />
          </radialGradient>
          {/* The Sun's corona peeking past Earth — the in-space eclipse the
              crew photographed at the far side. */}
          <radialGradient id="ar-corona" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6d8" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#ffd98a" stopOpacity="0.18" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="ar-earthclip">
            <circle cx="0" cy="0" r="34" />
          </clipPath>
        </defs>

        {/* The void */}
        <rect x="0" y="0" width="1000" height="640" fill="url(#ar-sky)" />
        <g fill="#ffffff">
          {SKY_STARS.map((s, i) => (
            <circle key={i} cx={s.cx} cy={s.cy} r={s.r} opacity={s.o} />
          ))}
        </g>

        {/* Orion and the Earthset sit close enough to the center that both
            survive the portrait slice crop without a shift. */}
        <g className="artemis-action">
          {/* Crescent Earth, setting behind the Moon's limb. Drawn before the
              limb so the Moon occludes it as it drops (see .artemis-earth). */}
          <g transform="translate(360, 270)">
            <g className="artemis-earth">
              {/* Sun's corona flaring past the disk */}
              <circle cx="0" cy="0" r="70" fill="url(#ar-corona)" />
              {/* Night side of Earth */}
              <circle cx="0" cy="0" r="34" fill="#0a1630" />
              <g clipPath="url(#ar-earthclip)">
                {/* Sunlit crescent on the left, carved by an offset disk */}
                <circle cx="-15" cy="-2" r="34" fill="#2f66c8" />
                <path d="M-34,-6 C-24,-14 -12,-10 -6,-16 L-6,-24 L-34,-24 Z" fill="#e6eef8" opacity="0.7" />
                <path d="M-30,14 C-22,10 -14,16 -6,12 L-6,22 C-18,24 -30,22 -34,18 Z" fill="#3f8f5a" opacity="0.75" />
                <path d="M-26,2 C-20,6 -14,4 -10,8 C-16,12 -24,10 -28,6 Z" fill="#e6eef8" opacity="0.55" />
              </g>
              {/* Thin atmosphere rim on the lit edge */}
              <path d="M-2,-34 A34,34 0 0 0 -2,34" fill="none" stroke="#9cc2ff" strokeWidth="1.3" opacity="0.5" />
            </g>
          </g>

          {/* The Moon's near limb — a large disc rising from the bottom,
              heavily cratered like the far side no human had seen. */}
          <circle cx="500" cy="1150" r="760" fill="url(#ar-moon)" />
          <path
            d="M100,504 A760,760 0 0 1 900,504"
            fill="none"
            stroke="#787d8b"
            strokeWidth="2.5"
            opacity="0.55"
          />
          <g>
            {CRATERS.map((c, i) => (
              <g key={i}>
                <ellipse cx={c.cx} cy={c.cy + c.r * 0.14} rx={c.r} ry={c.r * 0.42} fill="#24272f" opacity="0.5" />
                <ellipse cx={c.cx} cy={c.cy} rx={c.r} ry={c.r * 0.42} fill="#5f6472" opacity="0.4" />
                <ellipse cx={c.cx} cy={c.cy - c.r * 0.1} rx={c.r * 0.7} ry={c.r * 0.28} fill="#3a3e49" opacity="0.5" />
              </g>
            ))}
          </g>

          {/* Orion, coasting up and out. Outer group positions it; the inner
              class drifts it across the void (see .artemis-orion). */}
          <g transform="translate(620, 205)">
            <g className="artemis-orion">
              <g transform="rotate(-10)">
                {/* Four solar arrays in an X, behind the body */}
                <g className="artemis-panels">
                  <g transform="translate(16,17) rotate(-18)"><Wing /></g>
                  <g transform="translate(16,25) rotate(18)"><Wing /></g>
                  <g transform="scale(-1,1)">
                    <g transform="translate(16,17) rotate(-18)"><Wing /></g>
                    <g transform="translate(16,25) rotate(18)"><Wing /></g>
                  </g>
                  {/* A specular glint sweeping the upper-right wing */}
                  <g transform="translate(16,17) rotate(-18)">
                    <rect className="artemis-glint" x="14" y="-9" width="52" height="18" fill="#eaf1ff" />
                  </g>
                </g>

                {/* European Service Module — cylinder + main engine bell */}
                <rect x="-16" y="10" width="32" height="30" rx="2" fill="#c4c8d1" />
                <rect x="-16" y="10" width="11" height="30" rx="2" fill="#a7acb8" opacity="0.85" />
                <line x1="-16" y1="22" x2="16" y2="22" stroke="#8b909d" strokeWidth="0.7" />
                <line x1="-16" y1="31" x2="16" y2="31" stroke="#8b909d" strokeWidth="0.7" />
                <path d="M-7,40 L7,40 L11,55 L-11,55 Z" fill="#565a67" />
                <ellipse cx="0" cy="55" rx="11" ry="2.8" fill="#33363f" />

                {/* Crew module adapter */}
                <path d="M-18,4 L18,4 L16,10 L-16,10 Z" fill="#aeb3be" />

                {/* Crew module — blunt gumdrop cone, sunlit left */}
                <path d="M-20,4 L-17,-4 C-15,-19 -8,-29 0,-29 C8,-29 15,-19 17,-4 L20,4 Z" fill="#e2e6ec" />
                <path d="M0,-29 C8,-29 15,-19 17,-4 L20,4 L0,4 Z" fill="#bfc4cf" />
                <rect x="-21" y="1" width="42" height="5" rx="1.5" fill="#9aa0ad" />
                {/* Windows */}
                <path d="M-8,-14 L1,-14 L0,-9 L-8,-9 Z" fill="#1b2233" />
                <path d="M-8,-14 L1,-14 L0.5,-12 L-7.6,-12 Z" fill="#7fa8d8" opacity="0.5" />
              </g>
            </g>
          </g>
        </g>
      </svg>

      {/* Headline in the sky on landscape; on portrait it drops onto the
          dark foreground below the scene, matching the other milestone scenes. */}
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
