/**
 * SLA due-date computation.
 *
 * OPEN OPERATIONAL DECISION: the baseline states response windows in hours (4h/24h/48h/72h)
 * but does not say whether they are elapsed or business hours, nor which calendar applies.
 * Both policies are implemented and selected per route by `slaClock`, so the decision can be
 * recorded later without a code change. Business-hours mode uses a simple Mon-Fri 09:00-17:00
 * model and does NOT yet account for public holidays - that calendar is a G0 dependency.
 */

export type SlaClock = 'elapsed' | 'business'

const BUSINESS_START_HOUR = 9
const BUSINESS_END_HOUR = 17

export function computeSlaDueAt(args: { from: Date; hours: number; clock: SlaClock; timezone?: string }): Date {
  const { from, hours, clock } = args

  if (clock === 'elapsed') {
    return new Date(from.getTime() + hours * 60 * 60 * 1000)
  }

  let remainingMs = hours * 60 * 60 * 1000
  const cursor = new Date(from.getTime())

  while (remainingMs > 0) {
    const day = cursor.getDay()
    if (day === 0 || day === 6) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0)
      continue
    }

    const dayStart = new Date(cursor)
    dayStart.setHours(BUSINESS_START_HOUR, 0, 0, 0)
    const dayEnd = new Date(cursor)
    dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0)

    if (cursor < dayStart) {
      cursor.setTime(dayStart.getTime())
      continue
    }
    if (cursor >= dayEnd) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0)
      continue
    }

    const availableMs = dayEnd.getTime() - cursor.getTime()
    if (availableMs >= remainingMs) {
      cursor.setTime(cursor.getTime() + remainingMs)
      remainingMs = 0
    } else {
      remainingMs -= availableMs
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0)
    }
  }

  return cursor
}

export function isOverdue(slaDueAt: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!slaDueAt) return false
  const due = typeof slaDueAt === 'string' ? Date.parse(slaDueAt) : slaDueAt.getTime()
  if (Number.isNaN(due)) return false
  return due < now.getTime()
}
