'use client'

// Cumulative reps against the flat pace and the pace still needed to finish.
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { dailyPaceFor, type ChartPoint } from '@/lib/progress'
import type { Season } from '@/lib/seasons'

interface ProgressChartProps {
  chartData: ChartPoint[]
  requiredPerDay: number | null
  season: Season
}

export default function ProgressChart({ chartData, requiredPerDay, season }: ProgressChartProps) {
  const dailyPace = dailyPaceFor(season)
  const seriesName = (name: string) =>
    name === 'you'
      ? 'Your Push-ups'
      : name === 'required'
        ? `${requiredPerDay}/day Needed`
        : `${dailyPace}/day Pace`

  return (
    <div className="web-dashboard-detail card p-6 mb-8">
      <h2 className="font-bebas text-2xl text-liberty-red mb-4 text-center">
        YOUR PROGRESS TO {season.goal.toLocaleString()}
      </h2>
      <div className="h-[300px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="day"
              stroke="#666"
              tick={{ fill: '#999', fontSize: 12 }}
              label={{ value: 'July', position: 'insideBottom', offset: -5, fill: '#666' }}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: '#999', fontSize: 12 }}
              domain={[0, season.goal]}
              ticks={[0, 0.25, 0.5, 0.75, 1].map(fraction => Math.round(season.goal * fraction))}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#999' }}
              formatter={(value: number, name: string) => [value.toLocaleString(), seriesName(name)]}
              labelFormatter={(day) => `July ${day}`}
            />
            <Legend formatter={(value) => seriesName(value)} />

            {/* Pace line */}
            <Line
              type="monotone"
              dataKey="pace"
              name="pace"
              stroke="#666"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
            />

            {/* Required pace from today */}
            {requiredPerDay !== null && (
              <Line
                type="monotone"
                dataKey="required"
                name="required"
                stroke="#3B82F6"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            )}

            {/* User's line */}
            <Line
              type="monotone"
              dataKey="you"
              name="you"
              stroke="#DC2626"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#DC2626' }}
            />

            {/* Season goal line */}
            <ReferenceLine
              y={season.goal}
              stroke="#EBE7DC"
              strokeDasharray="3 3"
              label={{ value: season.goal.toLocaleString(), fill: '#EBE7DC', fontSize: 12, position: 'right' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-white/40 text-sm mt-2">
        Dashed gray line = {dailyPace} push-ups/day pace to hit {season.goal.toLocaleString()} by the final day.
        {requiredPerDay !== null && (
          <> Dashed blue line = {requiredPerDay} push-ups/day needed from today to finish.</>
        )}
      </p>
    </div>
  )
}
