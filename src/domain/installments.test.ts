import { describe, expect, it } from "vitest";
import { makePurchase } from "../test/factories";
import {
  installmentNumberIn, installmentsInMonth, installmentsOf, isActiveIn, isFinished, lastMonth,
  paidCount, remainingAmount,
} from "./installments";

describe("installments", () => {
  const p = makePurchase({ firstMonth: "2026-11", installmentsCount: 3, installmentAmount: 100000 });

  it("genera cuotas cruzando el año", () => {
    const list = installmentsOf(p);
    expect(list.map((i) => i.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(list.map((i) => i.number)).toEqual([1, 2, 3]);
    expect(list.every((i) => i.total === 3 && i.amount === 100000 && i.purchaseId === p.id)).toBe(true);
  });

  it("calcula último mes (incluye 72 cuotas)", () => {
    expect(lastMonth(p)).toBe("2027-01");
    expect(lastMonth(makePurchase({ firstMonth: "2026-10", installmentsCount: 72 }))).toBe("2032-09");
    expect(lastMonth(makePurchase({ firstMonth: "2026-10", installmentsCount: 1 }))).toBe("2026-10");
  });

  it("activa sólo entre primera y última", () => {
    expect(isActiveIn(p, "2026-10")).toBe(false);
    expect(isActiveIn(p, "2026-11")).toBe(true);
    expect(isActiveIn(p, "2027-01")).toBe(true);
    expect(isActiveIn(p, "2027-02")).toBe(false);
  });

  it("número de cuota del mes", () => {
    expect(installmentNumberIn(p, "2026-12")).toBe(2);
    expect(installmentNumberIn(p, "2027-02")).toBeNull();
  });

  it("terminada después del último mes", () => {
    expect(isFinished(p, "2027-01")).toBe(false);
    expect(isFinished(p, "2027-02")).toBe(true);
  });

  it("pagadas y restante", () => {
    expect(paidCount(p, "2026-09")).toBe(0);
    expect(paidCount(p, "2026-12")).toBe(1);
    expect(paidCount(p, "2027-05")).toBe(3);
    expect(remainingAmount(p, "2026-12")).toBe(200000);
    expect(remainingAmount(p, "2026-01")).toBe(300000);
    expect(remainingAmount(p, "2027-02")).toBe(0);
  });

  it("cuotas de un mes para varias compras", () => {
    const q = makePurchase({ firstMonth: "2026-12", installmentsCount: 1, installmentAmount: 5000 });
    const list = installmentsInMonth([p, q], "2026-12");
    expect(list).toHaveLength(2);
    expect(list.find((i) => i.purchaseId === q.id)?.number).toBe(1);
    expect(installmentsInMonth([p, q], "2027-03")).toEqual([]);
  });
});
