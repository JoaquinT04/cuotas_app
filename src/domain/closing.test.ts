import { describe, expect, it } from "vitest";
import { defaultFirstMonth, suggestFirstMonth } from "./closing";

describe("suggestFirstMonth", () => {
  it("sin cierre no sugiere", () => {
    expect(suggestFirstMonth("2026-09-10", {})).toBeNull();
  });

  it("compra antes del cierre, sin vencimiento: paga mes siguiente", () => {
    expect(suggestFirstMonth("2026-09-10", { closingDay: 25 })).toBe("2026-10");
  });

  it("compra el mismo día del cierre entra en ese resumen", () => {
    expect(suggestFirstMonth("2026-09-25", { closingDay: 25 })).toBe("2026-10");
  });

  it("compra después del cierre pasa al resumen siguiente", () => {
    expect(suggestFirstMonth("2026-09-26", { closingDay: 25 })).toBe("2026-11");
  });

  it("vencimiento posterior al cierre en el mismo mes: paga ese mes", () => {
    expect(suggestFirstMonth("2026-09-02", { closingDay: 3, dueDay: 15 })).toBe("2026-09");
  });

  it("vencimiento menor al cierre: paga mes siguiente", () => {
    expect(suggestFirstMonth("2026-09-10", { closingDay: 25, dueDay: 5 })).toBe("2026-10");
  });

  it("cierre 31 en febrero usa el último día", () => {
    expect(suggestFirstMonth("2026-02-28", { closingDay: 31 })).toBe("2026-03");
  });

  it("cruce de año", () => {
    expect(suggestFirstMonth("2026-12-21", { closingDay: 20 })).toBe("2027-02");
    expect(suggestFirstMonth("2026-12-10", { closingDay: 20 })).toBe("2027-01");
  });
});

describe("defaultFirstMonth", () => {
  it("mes siguiente, cruzando año", () => {
    expect(defaultFirstMonth("2026-09-10")).toBe("2026-10");
    expect(defaultFirstMonth("2026-12-15")).toBe("2027-01");
  });
});
