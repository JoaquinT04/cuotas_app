import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { PurchasesPage } from "./PurchasesPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

async function seed() {
  const r = renderApp(<PurchasesPage />);
  await r.repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
  await r.repos.purchases.put(makePurchase({ id: "tv", cardId: "visa", description: "Tele", firstMonth: "2026-08", installmentsCount: 6 }));
  await r.repos.purchases.put(makePurchase({ id: "old", cardId: "visa", description: "Zapatillas", firstMonth: "2026-01", installmentsCount: 3 }));
  await r.repos.purchases.put(makePurchase({ id: "fut", cardId: "visa", description: "Viaje", firstMonth: "2026-11", installmentsCount: 3 }));
  await screen.findByText("Tele");
  await screen.findByText("Viaje");
  return r;
}

describe("PurchasesPage", () => {
  it("por defecto muestra activas con número de cuota", async () => {
    await seed();
    expect(screen.getByText("Cuota 2/6")).toBeInTheDocument();
    expect(screen.getByText(/Empieza/)).toBeInTheDocument();
    expect(screen.queryByText("Zapatillas")).toBeNull();
  });

  it("filtra terminadas", async () => {
    const user = userEvent.setup();
    await seed();
    await user.click(screen.getByRole("button", { name: "Terminadas" }));
    expect(screen.getByText("Zapatillas")).toBeInTheDocument();
    expect(screen.queryByText("Tele")).toBeNull();
  });

  it("vista Gantt ubica barras por mes", async () => {
    const user = userEvent.setup();
    await seed();
    await user.click(screen.getByRole("button", { name: "Gantt" }));
    // from = 2026-09. Tele (2026-08..2027-01) se recorta a 2026-09..2027-01 → columnas 2 a 7.
    const tv = screen.getByTestId("gantt-bar-tv");
    expect(tv.dataset.start).toBe("2");
    expect(tv.dataset.end).toBe("7");
    // Viaje (2026-11..2027-01) → columnas 4 a 7.
    const fut = screen.getByTestId("gantt-bar-fut");
    expect(fut.dataset.start).toBe("4");
    expect(fut.dataset.end).toBe("7");
    expect(screen.queryByTestId("gantt-bar-old")).toBeNull();
    expect(within(screen.getByTestId("gantt")).getByText("Tele")).toBeInTheDocument();
  });

  it("gantt excluye compras más allá de las columnas visibles y avisa", async () => {
    const user = userEvent.setup();
    const r = await seed();
    await r.repos.purchases.put(makePurchase({ id: "big", cardId: "visa", description: "Largo", firstMonth: "2026-09", installmentsCount: 48 }));
    await r.repos.purchases.put(makePurchase({ id: "late", cardId: "visa", description: "Lejana", firstMonth: "2029-01", installmentsCount: 3 }));
    await screen.findByText("Largo");
    await user.click(screen.getByRole("button", { name: "Gantt" }));
    expect(screen.queryByTestId("gantt-bar-late")).toBeNull();
    expect(screen.getByText(/1 compra empieza después de/)).toBeInTheDocument();
    const bars = within(screen.getByTestId("gantt")).getAllByTestId(/^gantt-bar-/);
    expect(bars.length).toBeGreaterThan(0);
    for (const b of bars) expect(Number(b.dataset.start)).toBeLessThanOrEqual(Number(b.dataset.end));
  });

  it("muestra bajo 'Sin tarjeta' las compras con tarjeta desconocida", async () => {
    const r = await seed();
    await r.repos.purchases.put(makePurchase({ id: "gh", cardId: "ghost", description: "Huérfana", firstMonth: "2026-08", installmentsCount: 6 }));
    await screen.findByText("Huérfana");
    expect(screen.getByText("Sin tarjeta")).toBeInTheDocument();
  });
});
