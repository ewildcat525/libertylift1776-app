// Calendar-date helpers for the challenge.
//
// Never derive "today" from Date.toISOString() — it formats in UTC, which
// rolls over to tomorrow during the US evening (8pm ET is already the next
// day in UTC). The challenge day is the user's local calendar day.
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
