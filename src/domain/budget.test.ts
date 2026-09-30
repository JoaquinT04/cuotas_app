import { describe, expect, it } from "vitest";
import { makeCategory, makeFixedExpense, makeIncome, makePurchase } from "../test/factories";
import { appliesIn, monthBreakdown, type BudgetData } from "./budget";

const data: BudgetData = {
  incomes: [makeIncome({ amount: 50000000 })],
  fixedExpenses: [makeFixedExpense({ amount: 20000000 })],
  categories: [makeCategory({ monthlyAmount: 10000000 })],
  purchases: [makePurchase({ firstMonth: "2026-10", installmentsCount: 3, installmentAmount: 100000 })],
};

describe("appliesIn", () => {
  it("respeta inicio y fin inclusivos", () => {
    const item = { startMonth: "2026-03", endMonth: "2026-05" };
    expect(appliesIn(item, "2026-02")).toBe(false);
    expect(appliesIn(item, "2026-03")).toBe(true);
    expect(appliesIn(item, "2026-05")).toBe(true);
    expect(appliesIn(item, "2026-06")).toBe(false);
    expect(appliesIn({ startMonth: "2026-03" }, "2099-01")).toBe(true);
  });
});

describe("monthBreakdown", () => {
  it("calcula disponible del mes", () => {
    expect(monthBreakdown(data, "2026-10").ARS).toEqual({
      income: 50000000,
      fixed: 20000000,
      installments: 100000,
      variable: 10000000,
      available: 19900000,
    });
  });

  it("no cuenta cuotas fuera de rango", () => {
    expect(monthBreakdown(data, "2027-01").ARS?.installments).toBe(0);
  });

  it("respeta fin de ingresos", () => {
    const d = { ...data, incomes: [makeIncome({ amount: 100, endMonth: "2026-09" })] };
    expect(monthBreakdown(d, "2026-10").ARS?.income).toBe(0);
    expect(monthBreakdown(d, "2026-09").ARS?.income).toBe(100);
  });

  it("separa monedas sin mezclar", () => {
    const d = {
      ...data,
      purchases: [...data.purchases, makePurchase({ currency: "USD", installmentAmount: 5000, firstMonth: "2026-10" })],
    };
    const b = monthBreakdown(d, "2026-10");
    expect(b.USD).toEqual({ income: 0, fixed: 0, installments: 5000, variable: 0, available: -5000 });
    expect(b.ARS?.installments).toBe(100000);
  });

  it("sin datos devuelve objeto vacío", () => {
    expect(monthBreakdown({ incomes: [], fixedExpenses: [], categories: [], purchases: [] }, "2026-10")).toEqual({});
  });
});
