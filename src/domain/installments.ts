import type { Currency, Money } from "./money";
import { addMonths, monthDiff, type Month } from "./month";
import type { Purchase } from "./schemas";

export interface Installment {
  purchaseId: string;
  cardId: string;
  description: string;
  currency: Currency;
  month: Month;
  number: number;
  total: number;
  amount: Money;
}

function installmentAt(p: Purchase, number: number): Installment {
  return {
    purchaseId: p.id,
    cardId: p.cardId,
    description: p.description,
    currency: p.currency,
    month: addMonths(p.firstMonth, number - 1),
    number,
    total: p.installmentsCount,
    amount: p.installmentAmount,
  };
}

export function installmentsOf(p: Purchase): Installment[] {
  return Array.from({ length: p.installmentsCount }, (_, i) => installmentAt(p, i + 1));
}

export function lastMonth(p: Purchase): Month {
  return addMonths(p.firstMonth, p.installmentsCount - 1);
}

export function isActiveIn(p: Purchase, m: Month): boolean {
  return p.firstMonth <= m && m <= lastMonth(p);
}

export function installmentNumberIn(p: Purchase, m: Month): number | null {
  return isActiveIn(p, m) ? monthDiff(p.firstMonth, m) + 1 : null;
}

export function isFinished(p: Purchase, current: Month): boolean {
  return lastMonth(p) < current;
}

export function paidCount(p: Purchase, current: Month): number {
  return Math.max(0, Math.min(p.installmentsCount, monthDiff(p.firstMonth, current)));
}

export function remainingAmount(p: Purchase, from: Month): Money {
  return (p.installmentsCount - paidCount(p, from)) * p.installmentAmount;
}

export function installmentsInMonth(purchases: Purchase[], m: Month): Installment[] {
  return purchases.flatMap((p) => {
    const n = installmentNumberIn(p, m);
    return n === null ? [] : [installmentAt(p, n)];
  });
}
