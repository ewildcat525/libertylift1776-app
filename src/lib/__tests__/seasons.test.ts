import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SEASONS, seasonForDisplay, seasonForLogging, seasonLengthInDays } from '../seasons'

// lib/seasons.ts mirrors public.challenge_seasons by hand. Rebuild the rows
// from the migrations, in order, and fail when the two drift apart.
type SeasonRow = Record<string, string>

function seasonRowsFromMigrations(): Map<number, SeasonRow> {
  const dir = join(process.cwd(), 'supabase', 'migrations')
  const rows = new Map<number, SeasonRow>()
  const row = (year: number) => {
    if (!rows.has(year)) rows.set(year, {})
    return rows.get(year)!
  }

  for (const file of readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8')

    // insert into public.challenge_seasons (...) values (2026, 'name', date 'x', date 'y', ...)
    const insert = /insert into public\.challenge_seasons\s*\(([^)]*)\)\s*values([\s\S]*?);/gi
    for (const [, columnList, values] of Array.from(sql.matchAll(insert))) {
      const columns = columnList.split(',').map(column => column.trim())
      for (const [, tuple] of Array.from(values.matchAll(/\(\s*(\d{4}\s*,[\s\S]*?)\)\s*(?:,|$)/g))) {
        const fields = tuple.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(field => field.trim())
        const year = Number(fields[0])
        columns.forEach((column, index) => {
          if (index > 0 && fields[index] !== undefined) row(year)[column] = literal(fields[index])
        })
      }
    }

    // update public.challenge_seasons set a = x, b = y where year = 2026;
    const update = /update public\.challenge_seasons set([\s\S]*?)where year = (\d{4});/gi
    for (const [, assignments, year] of Array.from(sql.matchAll(update))) {
      for (const [, column, value] of Array.from(assignments.matchAll(/(\w+)\s*=\s*([^,\n]+)/g))) {
        row(Number(year))[column] = literal(value)
      }
    }
  }
  return rows
}

// Strip SQL casts and quotes, and normalise timestamps to ISO so they compare
// with the mirror's strings.
function literal(raw: string): string {
  const value = raw.trim().replace(/^(date|timestamptz)\s+/i, '').replace(/^'|'$/g, '')
  const timestamp = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})\+00$/.exec(value)
  return timestamp ? `${timestamp[1]}T${timestamp[2]}Z` : value
}

describe('SEASONS mirror', () => {
  const rows = seasonRowsFromMigrations()

  it('has one row per season in the database', () => {
    expect(SEASONS.map(season => season.year)).toEqual(Array.from(rows.keys()).sort())
  })

  it.each(SEASONS.map(season => [season.year, season] as const))(
    '%i matches public.challenge_seasons',
    (year, season) => {
      const row = rows.get(year)!
      expect({
        name: season.name,
        goal: String(season.goal),
        daily_cap: String(season.dailyCap),
        per_log_cap: String(season.perLogCap),
        time_zone: season.timeZone,
        starts_on: season.startsOn,
        ends_on: season.endsOn,
        final_push_on: season.finalPushOn,
        logging_opens_at: season.loggingOpensAt,
        logging_closes_at: season.loggingClosesAt,
        final_push_opens_at: season.finalPushOpensAt,
        final_push_deadline: season.finalPushDeadline,
      }).toEqual({
        name: row.name,
        goal: row.goal,
        daily_cap: row.daily_cap,
        per_log_cap: row.per_log_cap,
        time_zone: row.time_zone,
        starts_on: row.starts_on,
        ends_on: row.ends_on,
        final_push_on: row.final_push_on,
        logging_opens_at: row.logging_opens_at,
        logging_closes_at: row.logging_closes_at,
        final_push_opens_at: row.final_push_opens_at,
        final_push_deadline: row.final_push_deadline,
      })
    },
  )
})

describe('season windows', () => {
  it.each(SEASONS.map(season => [season.year, season] as const))('%i is internally consistent', (_, season) => {
    expect(season.finalPushOn >= season.startsOn && season.finalPushOn <= season.endsOn).toBe(true)
    expect(Date.parse(season.loggingOpensAt)).toBeLessThan(Date.parse(season.loggingClosesAt))
    expect(Date.parse(season.finalPushOpensAt)).toBeLessThan(Date.parse(season.finalPushDeadline))
    // The bell rings before the books close, never after.
    expect(Date.parse(season.finalPushDeadline)).toBeLessThan(Date.parse(season.loggingClosesAt))
    expect(seasonLengthInDays(season)).toBe(31)
  })
})

describe('season selection', () => {
  it('keeps showing the finished season all offseason', () => {
    expect(seasonForDisplay(new Date('2026-09-23T12:00:00-04:00')).year).toBe(2026)
    expect(seasonForDisplay(new Date('2027-07-01T00:00:00-04:00')).year).toBe(2027)
  })

  it('logs into the open season, or the next scheduled one', () => {
    expect(seasonForLogging(new Date('2026-07-10T12:00:00Z')).year).toBe(2026)
    expect(seasonForLogging(new Date('2026-08-02T09:59:59Z')).year).toBe(2026)
    expect(seasonForLogging(new Date('2026-08-02T10:00:00Z')).year).toBe(2027)
  })
})
