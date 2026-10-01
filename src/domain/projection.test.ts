import { describe, expect, it } from "vitest";
import { makeIncome, makePurchase } from "../test/factories";
import type { BudgetData } from "./budget";
import { cardSummaries, previewPurchase, project } from "./projection";

const empty: BudgetData = { purchases: [], incomes: [], fixedExpenses: [], categories: [] };

describe("project", () => {
  it("devuelve count meses desde from, agregando por tarjeta", () => {
    const a = makePurchase({ cardId: "c1", firstMonth: "2026-10", installmentsCount: 2, installmentAmount: 1000 });
    const b = makePurchase({ cardId: "c1", firstMonth: "2026-11", installmentsCount: 1, installmentAmount: 500 });
    const c = makePurchase({ cardId: "c2", firstMonth: "2026-11", installmentsCount: 1, installmentAmount: 300 });
    const result = project({ ...empty, purchases: [a, b, c] }, "2026-10", 3);
    expect(result.map((r) => r.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(result[1].byCard.ARS).toEqual({ c1: 1500, c2: 300 });
    expect(result[1].installments).toHaveLength(3);
    expect(result[1].breakdown.ARS?.installments).toBe(1800);
    expect(result[2].byCard).toEqual({});
  });
});

describe("cardSummaries", () => {
  it("resume compras pendientes por tarjeta y moneda", () => {
    const a = makePurchase({ cardId: "c1", firstMonth: "2026-08", installmentsCount: 3, installmentAmount: 100000 });
    const b = makePurchase({ cardId: "c1", firstMonth: "2026-10", installmentsCount: 6, installmentAmount: 50000 });
    const done = makePurchase({ cardId: "c1", firstMonth: "2026-01", installmentsCount: 2 });
    const usd = makePurchase({ cardId: "c1", currency: "USD", firstMonth: "2026-09", installmentsCount: 1, installmentAmount: 700 });
    const result = cardSummaries([a, b, done, usd], "2026-09");
    expect(result).toContainEqual({
      cardId: "c1", currency: "ARS", thisMonth: 100000, activeCount: 2, lastMonth: "2027-03", remaining: 500000,
    });
    expect(result).toContainEqual({
      cardId: "c1", currency: "USD", thisMonth: 700, activeCount: 1, lastMonth: "2026-09", remaining: 700,
    });
    expect(result).toHaveLength(2);
  });
});

describe("previewPurchase", () => {
  const data: BudgetData = { ...empty, incomes: [makeIncome({ amount: 10000 })] };

  it("compra nueva: after = before - cuota en cada mes", () => {
    const draft = makePurchase({ id: "draft", firstMonth: "2026-10", installmentsCount: 2, installmentAmount: 4000 });
    expect(previewPurchase(data, draft, "2026-09")).toEqual([
      { month: "2026-10", before: 10000, after: 6000 },
      { month: "2026-11", before: 10000, after: 6000 },
    ]);
  });

  it("marca meses negativos", () => {
    const draft = makePurchase({ id: "draft", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 15000 });
    expect(previewPurchase(data, draft, "2026-09")[0].after).toBe(-5000);
  });

  it("editar no cuenta dos veces la compra original", () => {
    const original = makePurchase({ id: "p1", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 1000 });
    const edited = { ...original, installmentAmount: 3000 };
    const [row] = previewPurchase({ ...data, purchases: [original] }, edited, "2026-09");
    expect(row).toEqual({ month: "2026-10", before: 9000, after: 7000 });
  });

  it("sólo devuelve meses desde from (los pasados ya se pagaron)", () => {
    const draft = makePurchase({ id: "draft", firstMonth: "2026-07", installmentsCount: 4, installmentAmount: 15000 });
    const rows = previewPurchase(data, draft, "2026-09");
    expect(rows.map((r) => r.month)).toEqual(["2026-09", "2026-10"]);
    expect(rows.every((r) => r.after === -5000)).toBe(true);
  });
});
