import { describe, expect, it } from "vitest";
import { divideEvenly, formatMoney, formatMoneyInput, parseMoneyInput, toCents } from "./money";

describe("toCents", () => {
  it("redondea a centavos", () => {
    expect(toCents(10.1)).toBe(1010);
    expect(toCents(0.29)).toBe(29);
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["$ 10.000", 1000000],
    ["10000", 1000000],
    ["10.5", 1050],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["  250  ", 25000],
  ])("parsea %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1,2,3", "12,345", "1.2.3,4,5"])("rechaza %s", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formatea ARS en es-AR", () => {
    expect(formatMoney(123456, "ARS")).toMatch(/1\.234,56/);
  });
  it("formatea USD con prefijo US$", () => {
    expect(formatMoney(1050, "USD")).toMatch(/US\$/);
    expect(formatMoney(1050, "USD")).toMatch(/10,50/);
  });
  it("formatea negativos", () => {
    expect(formatMoney(-5000, "ARS")).toMatch(/-.*50,00/);
  });
});

describe("formatMoneyInput", () => {
  it("devuelve número editable con coma decimal", () => {
    expect(formatMoneyInput(123456)).toBe("1234,56");
    expect(formatMoneyInput(1000000)).toBe("10000,00");
  });
  it("vuelve a parsearse al mismo valor", () => {
    expect(parseMoneyInput(formatMoneyInput(987654))).toBe(987654);
  });
});

describe("divideEvenly", () => {
  it("divide y redondea", () => {
    expect(divideEvenly(12000000, 12)).toBe(1000000);
    expect(divideEvenly(10000, 3)).toBe(3333);
  });
});
