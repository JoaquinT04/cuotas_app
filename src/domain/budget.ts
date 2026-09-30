import { isActiveIn } from "./installments";
import { CURRENCIES, type Currency, type Money } from "./money";
import type { Month } from "./month";
import type { BudgetCategory, FixedExpense, Income, Purchase } from "./schemas";

export type ByCurrency<T> = Partial<Record<Currency, T>>;

export interface MonthBreakdown {
  income: Money;
  fixed: Money;
  installments: Money;
  variable: Money;
  available: Money;
}

export interface BudgetData {
  purchases: Purchase[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  categories: BudgetCategory[];
}

export function emptyBreakdown(): MonthBreakdown {
  return { income: 0, fixed: 0, installments: 0, variable: 0, available: 0 };
}

export function appliesIn(item: { startMonth: Month; endMonth?: Month }, m: Month): boolean {
  return item.startMonth <= m && (item.endMonth === undefined || m <= item.endMonth);
}

type Component = Exclude<keyof MonthBreakdown, "available">;

export function monthBreakdown(data: BudgetData, m: Month): ByCurrency<MonthBreakdown> {
  const out: ByCurrency<MonthBreakdown> = {};
  const add = (currency: Currency, key: Component, amount: Money) => {
    const b = (out[currency] ??= emptyBreakdown());
    b[key] += amount;
  };

  for (const i of data.incomes) if (appliesIn(i, m)) add(i.currency, "income", i.amount);
  for (const f of data.fixedExpenses) if (appliesIn(f, m)) add(f.currency, "fixed", f.amount);
  for (const p of data.purchases) if (isActiveIn(p, m)) add(p.currency, "installments", p.installmentAmount);
  for (const c of data.categories) add(c.currency, "variable", c.monthlyAmount);

  for (const currency of CURRENCIES) {
    const b = out[currency];
    if (b) b.available = b.income - b.fixed - b.installments - b.variable;
  }
  return out;
}
