export function getCalendarMonthBounds(reference = new Date()) {
  const startOfThisMonth = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const startOfLastMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
  const endOfLastMonth = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    0,
    23,
    59,
    59,
    999
  )

  return { startOfThisMonth, startOfLastMonth, endOfLastMonth }
}

/** Month-over-month % change. Returns 100 when growing from zero, 0 when unchanged at zero. */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 100)
  }
  if (current > 0) {
    return 100
  }
  return 0
}

export function countExistedByEndOfLastMonth<T extends { created_at: string }>(items: T[]): number {
  const { endOfLastMonth } = getCalendarMonthBounds()
  return items.filter((item) => new Date(item.created_at) <= endOfLastMonth).length
}
