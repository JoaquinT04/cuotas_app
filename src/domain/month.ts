/** Mes en formato "YYYY-MM". Se ordena correctamente como string. */
export type Month = string;

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function toMonth(year: number, month: number): Month {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonth(m: Month): { year: number; month: number } {
  const [year, month] = m.split("-").map(Number);
  return { year, month };
}

function index(m: Month): number {
  const { year, month } = parseMonth(m);
  return year * 12 + (month - 1);
}

export function addMonths(m: Month, n: number): Month {
  const i = index(m) + n;
  return toMonth(Math.floor(i / 12), (i % 12) + 1);
}

export function monthDiff(from: Month, to: Month): number {
  return index(to) - index(from);
}

export function monthRange(from: Month, count: number): Month[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i));
}

export function currentMonth(now: Date = new Date()): Month {
  return toMonth(now.getFullYear(), now.getMonth() + 1);
}

export function todayIso(now: Date = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

export function monthOfDate(isoDate: string): Month {
  return isoDate.slice(0, 7);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

export function formatMonth(m: Month): string {
  const { year, month } = parseMonth(m);
  return monthFormatter.format(new Date(year, month - 1, 1));
}
