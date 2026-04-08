/**
 * constants.ts
 * App-wide constants: EF colours, helper, pagination size, month labels.
 */

export const EF_COLORS: Record<number, string> = {
  0: '#4caf50',
  1: '#80ecf1',
  2: '#eeff00',
  3: '#f4a836',
  4: '#b02727',
  5: '#fa01d0',
}

export function getEfColor(ef: number | null): string {
  if (ef === null || !(ef in EF_COLORS)) return '#7a9ab8'
  return EF_COLORS[ef]
}

export const PAGE_SIZE = 50

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
