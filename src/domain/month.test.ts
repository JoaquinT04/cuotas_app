import { describe, expect, it } from "vitest";
import {
  addMonths, currentMonth, daysInMonth, formatMonth, isMonth, monthDiff, monthOfDate,
  monthRange, parseMonth, toMonth, todayIso,
} from "./month";

describe("month", () => {
  it("valida formato", () => {
    expect(isMonth("2026-01")).toBe(true);
    expect(isMonth("2026-12")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(isMonth("abc")).toBe(false);
  });

  it("construye y parsea", () => {
    expect(toMonth(2026, 3)).toBe("2026-03");
    expect(parseMonth("2026-11")).toEqual({ year: 2026, month: 11 });
  });

  it("suma meses cruzando años", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 71)).toBe("2032-09");
    expect(addMonths("2026-05", 0)).toBe("2026-05");
  });

  it("calcula diferencia", () => {
    expect(monthDiff("2026-11", "2027-02")).toBe(3);
    expect(monthDiff("2027-02", "2026-11")).toBe(-3);
  });

  it("genera rangos", () => {
    expect(monthRange("2026-11", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthRange("2026-11", 0)).toEqual([]);
  });

  it("usa fecha local", () => {
    expect(currentMonth(new Date(2026, 8, 30))).toBe("2026-09");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(monthOfDate("2026-12-31")).toBe("2026-12");
  });

  it("días por mes", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("formatea en español", () => {
    const label = formatMonth("2026-11");
    expect(label).toMatch(/nov/i);
    expect(label).toMatch(/2026/);
  });
});
