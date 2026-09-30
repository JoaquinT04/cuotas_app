export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Monto en centavos. Siempre entero. */
export type Money = number;

export function toCents(value: number): Money {
  return Math.round(value * 100);
}

/**
 * Acepta formato es-AR ("1.234,56") y punto decimal ("10.5").
 * Sin coma: un punto seguido de exactamente 3 dígitos (o varios puntos) es separador de miles.
 */
export function parseMoneyInput(input: string): Money | null {
  let s = input.replace(/[\s$]/g, "").replace(/^(ARS|USD|US)/i, "");
  if (s === "") return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = parts.join("");
    }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return toCents(Number(s));
}

const formatters = new Map<Currency, Intl.NumberFormat>();

export function formatMoney(amount: Money, currency: Currency): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount / 100);
}

export function formatMoneyInput(amount: Money): string {
  return (amount / 100).toFixed(2).replace(".", ",");
}

export function divideEvenly(total: Money, parts: number): Money {
  return Math.round(total / parts);
}
