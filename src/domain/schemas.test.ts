import { describe, expect, it } from "vitest";
import {
  budgetCategoryInputSchema, cardInputSchema, fixedExpenseInputSchema, incomeInputSchema,
  purchaseInputSchema, purchaseSchema,
} from "./schemas";

const validPurchase = {
  cardId: "c1",
  description: "Heladera",
  currency: "ARS",
  installmentAmount: 1000000,
  installmentsCount: 12,
  firstMonth: "2026-10",
};

describe("purchaseInputSchema", () => {
  it("acepta compra válida", () => {
    expect(purchaseInputSchema.safeParse(validPurchase).success).toBe(true);
  });
  it.each([0, 73, 1.5])("rechaza %s cuotas", (installmentsCount) => {
    expect(purchaseInputSchema.safeParse({ ...validPurchase, installmentsCount }).success).toBe(false);
  });
  it("rechaza monto 0, NaN o decimal", () => {
    for (const installmentAmount of [0, Number.NaN, 10.5]) {
      expect(purchaseInputSchema.safeParse({ ...validPurchase, installmentAmount }).success).toBe(false);
    }
  });
  it("rechaza mes inválido y descripción vacía", () => {
    const r = purchaseInputSchema.safeParse({ ...validPurchase, firstMonth: "2026-13", description: "  " });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("firstMonth");
      expect(paths).toContain("description");
    }
  });
  it("purchaseSchema exige campos de entidad", () => {
    expect(purchaseSchema.safeParse(validPurchase).success).toBe(false);
    expect(
      purchaseSchema.safeParse({ ...validPurchase, id: "x", createdAt: "a", updatedAt: "b" }).success,
    ).toBe(true);
  });
});

describe("cardInputSchema", () => {
  it("archived es false por defecto", () => {
    const r = cardInputSchema.parse({ name: "Visa", color: "#112233" });
    expect(r.archived).toBe(false);
  });
  it("rechaza día de cierre fuera de rango", () => {
    expect(cardInputSchema.safeParse({ name: "Visa", color: "#112233", closingDay: 32 }).success).toBe(false);
  });
});

describe("períodos", () => {
  const income = { name: "Sueldo", amount: 100, currency: "ARS", startMonth: "2026-05" };
  it("acepta sin fin", () => {
    expect(incomeInputSchema.safeParse(income).success).toBe(true);
  });
  it("rechaza fin anterior al inicio con error en endMonth", () => {
    const r = incomeInputSchema.safeParse({ ...income, endMonth: "2026-04" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["endMonth"]);
  });
  it("gasto fijo exige categoría", () => {
    expect(fixedExpenseInputSchema.safeParse(income).success).toBe(false);
    expect(fixedExpenseInputSchema.safeParse({ ...income, category: "Vivienda" }).success).toBe(true);
  });
});

describe("budgetCategoryInputSchema", () => {
  it("permite 0 y rechaza negativos", () => {
    const base = { name: "Comida", currency: "ARS" };
    expect(budgetCategoryInputSchema.safeParse({ ...base, monthlyAmount: 0 }).success).toBe(true);
    expect(budgetCategoryInputSchema.safeParse({ ...base, monthlyAmount: -1 }).success).toBe(false);
  });
});
