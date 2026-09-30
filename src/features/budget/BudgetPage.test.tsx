import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";
import { BudgetPage } from "./BudgetPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

describe("BudgetPage", () => {
  it("carga ingreso, gasto fijo y categoría y calcula disponible", async () => {
    const user = userEvent.setup();
    renderApp(<BudgetPage />);

    const incomes = await screen.findByRole("region", { name: "Ingresos" });
    await user.click(within(incomes).getByRole("button", { name: "Agregar" }));
    await user.type(within(incomes).getByLabelText("Nombre"), "Sueldo");
    await user.type(within(incomes).getByLabelText("Monto"), "500.000");
    await user.click(within(incomes).getByRole("button", { name: "Guardar" }));
    expect(await within(incomes).findByText("Sueldo")).toBeInTheDocument();

    const fixed = screen.getByRole("region", { name: "Gastos fijos" });
    await user.click(within(fixed).getByRole("button", { name: "Agregar" }));
    await user.type(within(fixed).getByLabelText("Nombre"), "Alquiler");
    await user.type(within(fixed).getByLabelText("Monto"), "200.000");
    await user.type(within(fixed).getByLabelText("Categoría"), "Vivienda");
    await user.click(within(fixed).getByRole("button", { name: "Guardar" }));
    expect(await within(fixed).findByText(/Alquiler/)).toBeInTheDocument();

    const cats = screen.getByRole("region", { name: "Presupuesto variable" });
    await user.click(within(cats).getByRole("button", { name: "Agregar" }));
    await user.type(within(cats).getByLabelText("Nombre"), "Comida");
    await user.type(within(cats).getByLabelText("Monto mensual"), "100.000");
    await user.click(within(cats).getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByTestId("budget-available-ARS-2026-09")).toHaveTextContent(/200\.000,00/));
  });

  it("valida fin anterior al inicio", async () => {
    const user = userEvent.setup();
    renderApp(<BudgetPage />);
    const incomes = await screen.findByRole("region", { name: "Ingresos" });
    await user.click(within(incomes).getByRole("button", { name: "Agregar" }));
    await user.type(within(incomes).getByLabelText("Nombre"), "Bono");
    await user.type(within(incomes).getByLabelText("Monto"), "1000");
    const end = within(incomes).getByLabelText("Mes de fin");
    await user.type(end, "2026-01");
    await user.click(within(incomes).getByRole("button", { name: "Guardar" }));
    expect(await within(incomes).findByText(/fin debe ser igual o posterior/)).toBeInTheDocument();
  });
});
