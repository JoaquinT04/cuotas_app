import { monthBreakdown, type BudgetData, type ByCurrency, type MonthBreakdown } from "./budget";
import {
  installmentsInMonth, installmentsOf, isActiveIn, lastMonth, remainingAmount, type Installment,
} from "./installments";
import type { Currency, Money } from "./money";
import { monthRange, type Month } from "./month";
import type { Purchase } from "./schemas";

export interface MonthProjection {
  month: Month;
  breakdown: ByCurrency<MonthBreakdown>;
  byCard: ByCurrency<Record<string, Money>>;
  installments: Installment[];
}

export function project(data: BudgetData, from: Month, count: number): MonthProjection[] {
  return monthRange(from, count).map((month) => {
    const installments = installmentsInMonth(data.purchases, month);
    const byCard: ByCurrency<Record<string, Money>> = {};
    for (const i of installments) {
      const row = (byCard[i.currency] ??= {});
      row[i.cardId] = (row[i.cardId] ?? 0) + i.amount;
    }
    return { month, breakdown: monthBreakdown(data, month), byCard, installments };
  });
}

export interface CardSummary {
  cardId: string;
  currency: Currency;
  thisMonth: Money;
  activeCount: number;
  lastMonth: Month;
  remaining: Money;
}

export function cardSummaries(purchases: Purchase[], current: Month): CardSummary[] {
  const byKey = new Map<string, CardSummary>();
  for (const p of purchases) {
    const last = lastMonth(p);
    if (last < current) continue;
    const key = `${p.cardId}|${p.currency}`;
    let s = byKey.get(key);
    if (!s) {
      s = { cardId: p.cardId, currency: p.currency, thisMonth: 0, activeCount: 0, lastMonth: last, remaining: 0 };
      byKey.set(key, s);
    }
    s.activeCount += 1;
    if (isActiveIn(p, current)) s.thisMonth += p.installmentAmount;
    if (last > s.lastMonth) s.lastMonth = last;
    s.remaining += remainingAmount(p, current);
  }
  return [...byKey.values()];
}

export interface PreviewRow {
  month: Month;
  before: Money;
  after: Money;
}

export function previewPurchase(data: BudgetData, draft: Purchase): PreviewRow[] {
  const after: BudgetData = {
    ...data,
    purchases: [...data.purchases.filter((p) => p.id !== draft.id), draft],
  };
  return installmentsOf(draft).map(({ month }) => ({
    month,
    before: monthBreakdown(data, month)[draft.currency]?.available ?? 0,
    after: monthBreakdown(after, month)[draft.currency]?.available ?? 0,
  }));
}
