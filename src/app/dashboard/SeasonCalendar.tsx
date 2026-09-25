'use client'

// The challenge month as a calendar. Tapping a day picks it for logging;
// a day with reps can be cleared until the books close.
import { localDateString, type ChallengePhase } from '@/lib/dates'
import { dailyPaceFor, seasonDate } from '@/lib/progress'
import type { Season } from '@/lib/seasons'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface SeasonCalendarProps {
  season: Season
  dailyLogs: Record<string, number>
  selectedDate: string
  onSelectDate: (date: string) => void
  phase: ChallengePhase | null
  onClearDay: () => void
}

export default function SeasonCalendar({
  season,
  dailyLogs,
  selectedDate,
  onSelectDate,
  phase,
  onClearDay,
}: SeasonCalendarProps) {
  const dailyTarget = dailyPaceFor(season)
  const month = new Date(`${season.startsOn}T12:00:00`)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const startingDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const today = localDateString()

  return (
    <div className="web-dashboard-detail card p-6 mb-8">
      <h2 className="font-bebas text-3xl text-liberty-red text-center mb-4">
        JULY {season.year}
      </h2>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs text-white/50 font-semibold py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before the 1st */}
        {Array.from({ length: startingDay }, (_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = seasonDate(season, day)
          const count = dailyLogs[dateStr] || 0
          const isToday = dateStr === today

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              aria-label={`July ${day}: ${count > 0 ? `${count} push-ups logged` : 'no push-ups logged'}`}
              aria-pressed={selectedDate === dateStr}
              className={`aspect-square flex flex-col items-center justify-center cursor-pointer transition-all text-xs
                ${count > 0
                  ? count >= dailyTarget
                    ? 'bg-liberty-red/40 border border-liberty-red/60'
                    : 'bg-liberty-red/20 border border-liberty-red/30'
                  : 'bg-white/5 hover:bg-white/10'
                }
                ${isToday ? 'ring-2 ring-liberty-gold' : ''}
                ${selectedDate === dateStr ? 'ring-2 ring-white' : ''}
              `}
            >
              <span className={`font-semibold ${count > 0 ? 'text-white' : 'text-white/60'}`}>
                {day}
              </span>
              {count > 0 && (
                <span className="text-[10px] text-liberty-red font-bold">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-liberty-red/20 border border-liberty-red/30"></div>
          <span>Logged</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-liberty-red/40 border border-liberty-red/60"></div>
          <span>{dailyTarget}+ (on pace)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 ring-2 ring-liberty-gold"></div>
          <span>Today</span>
        </div>
      </div>

      {/* Clear day button (retired with the rest of the editing UI once
          the books are closed — the database freeze would reject it) */}
      {phase !== 'ended' && dailyLogs[selectedDate] > 0 && (
        <button
          onClick={onClearDay}
          className="mt-4 w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          Clear {dailyLogs[selectedDate]} push-ups for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </button>
      )}
    </div>
  )
}
