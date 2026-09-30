import { addMonths, daysInMonth, monthOfDate, toMonth, type Month } from "./month";
import type { Card } from "./schemas";

export function defaultFirstMonth(purchaseDate: string): Month {
  return addMonths(monthOfDate(purchaseDate), 1);
}

/** Regla del spec §5.1: el "mes de la cuota" es el mes en que se paga. */
export function suggestFirstMonth(
  purchaseDate: string,
  card: Pick<Card, "closingDay" | "dueDay">,
): Month | null {
  if (card.closingDay === undefined) return null;
  const [year, month, day] = purchaseDate.split("-").map(Number);
  const effectiveClosing = Math.min(card.closingDay, daysInMonth(year, month));
  const purchaseMonth = toMonth(year, month);
  const closingMonth = day <= effectiveClosing ? purchaseMonth : addMonths(purchaseMonth, 1);
  const paysSameMonth = card.dueDay !== undefined && card.dueDay > card.closingDay;
  return paysSameMonth ? closingMonth : addMonths(closingMonth, 1);
}
