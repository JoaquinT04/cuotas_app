import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { makeCard, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { MonthDetailPage } from "./MonthDetailPage";

const ui = (
  <Routes>
    <Route path="/mes/:month" element={<MonthDetailPage />} />
  </Routes>
);

describe("MonthDetailPage", () => {
  it("lista cuotas con n/N e ingresos del mes", async () => {
    const { repos } = renderApp(ui, { route: "/mes/2026-11" });
    await repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await repos.incomes.put(makeIncome({ name: "Sueldo" }));
    await repos.purchases.put(makePurchase({ cardId: "visa", description: "Tele", firstMonth: "2026-10", installmentsCount: 6 }));
    expect(await screen.findByText("Tele")).toBeInTheDocument();
    expect(await screen.findByText("Sueldo")).toBeInTheDocument();
    expect(screen.getByText(/Visa · 2\/6/)).toBeInTheDocument();
  });

  it("mes inválido muestra mensaje", () => {
    renderApp(ui, { route: "/mes/2026-13" });
    expect(screen.getByText("Mes inválido.")).toBeInTheDocument();
  });
});
