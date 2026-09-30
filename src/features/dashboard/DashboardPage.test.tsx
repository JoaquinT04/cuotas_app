import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makeFixedExpense, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { DashboardPage } from "./DashboardPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

describe("DashboardPage", () => {
  it("sin tarjetas muestra guía inicial", async () => {
    renderApp(<DashboardPage />);
    expect(await screen.findByText("Agregá tu primera tarjeta")).toBeInTheDocument();
  });

  it("muestra disponible, resumen por tarjeta y meses", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<DashboardPage />);
    await repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await repos.incomes.put(makeIncome({ amount: 50000000 }));
    await repos.fixedExpenses.put(makeFixedExpense({ amount: 20000000 }));
    await repos.purchases.put(makePurchase({ cardId: "visa", firstMonth: "2026-09", installmentsCount: 3, installmentAmount: 1000000 }));

    expect(await screen.findByTestId("available-ARS")).toHaveTextContent(/290\.000,00/);
    expect(await screen.findByText(/1 compra · última cuota/)).toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /sept|sep/i }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(await screen.findByTestId("available-ARS")).toHaveTextContent(/290\.000,00/);
  });

  it("disponible negativo se marca en rojo", async () => {
    const { repos } = renderApp(<DashboardPage />);
    await repos.cards.put(makeCard({ id: "visa" }));
    await repos.purchases.put(makePurchase({ cardId: "visa", firstMonth: "2026-09", installmentAmount: 5000 }));
    const hero = await screen.findByTestId("available-ARS");
    expect(hero).toHaveTextContent(/-/);
    expect(hero.className).toMatch(/text-red-600/);
  });
});
