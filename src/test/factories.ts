import type { BudgetCategory, Card, FixedExpense, Income, Purchase } from "../domain/schemas";

let seq = 0;
function base() {
  seq += 1;
  return {
    id: `id-${seq}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function makeCard(overrides: Partial<Card> = {}): Card {
  return { ...base(), name: "Visa", color: "#6366f1", archived: false, ...overrides };
}

export function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    ...base(),
    cardId: "card-1",
    description: "Compra",
    currency: "ARS",
    installmentAmount: 100000,
    installmentsCount: 3,
    firstMonth: "2026-10",
    ...overrides,
  };
}

export function makeIncome(overrides: Partial<Income> = {}): Income {
  return { ...base(), name: "Sueldo", amount: 50000000, currency: "ARS", startMonth: "2026-01", ...overrides };
}

export function makeFixedExpense(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    ...base(),
    name: "Alquiler",
    amount: 20000000,
    currency: "ARS",
    startMonth: "2026-01",
    category: "Vivienda",
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<BudgetCategory> = {}): BudgetCategory {
  return { ...base(), name: "Comida", monthlyAmount: 10000000, currency: "ARS", ...overrides };
}
