import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeIncome } from "../../test/factories";
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

  it("monto ilegible en un recurrente muestra Monto inválido y no guarda", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BudgetPage />);
    const fixed = await screen.findByRole("region", { name: "Gastos fijos" });
    await user.click(within(fixed).getByRole("button", { name: "Agregar" }));
    await user.type(within(fixed).getByLabelText("Nombre"), "Alquiler");
    await user.type(within(fixed).getByLabelText("Monto"), "mucho");
    await user.click(within(fixed).getByRole("button", { name: "Guardar" }));
    expect(await within(fixed).findByText("Monto inválido")).toBeInTheDocument();
    expect(await repos.fixedExpenses.list()).toEqual([]);
  });

  it("editar un ingreso y vaciar Mes de fin lo deja sin fin", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BudgetPage />);
    await repos.incomes.put(makeIncome({ id: "sueldo", name: "Sueldo", startMonth: "2026-01", endMonth: "2026-12" }));
    const incomes = await screen.findByRole("region", { name: "Ingresos" });
    await user.click(await within(incomes).findByRole("button", { name: /Sueldo/ }));
    const end = within(incomes).getByLabelText("Mes de fin");
    expect(end).toHaveValue("2026-12");
    fireEvent.change(end, { target: { value: "" } });
    await user.click(within(incomes).getByRole("button", { name: "Guardar" }));
    // No usar findByText(/sin fin/): también matchea el hint del formulario, que se desmonta al guardar.
    await waitFor(() =>
      expect(within(incomes).getByRole("button", { name: /Sueldo/ })).toHaveTextContent(/sin fin/),
    );
    const [saved] = await repos.incomes.list();
    expect(saved.endMonth).toBeUndefined();
  });

  it("un ingreso en USD va a su propia tabla y no altera la de ARS", async () => {
    const { repos } = renderApp(<BudgetPage />);
    await repos.incomes.put(makeIncome({ name: "Sueldo", amount: 50000000, currency: "ARS", startMonth: "2026-01" }));
    await repos.incomes.put(makeIncome({ name: "Freelance", amount: 100000, currency: "USD", startMonth: "2026-01" }));
    const usd = await screen.findByRole("region", { name: "Proyección · USD" });
    await waitFor(() =>
      expect(within(usd).getByTestId("budget-available-USD-2026-09")).toHaveTextContent(/1.000,00/),
    );
    const ars = screen.getByRole("region", { name: "Proyección · ARS" });
    expect(within(ars).getByTestId("budget-available-ARS-2026-09")).toHaveTextContent(/500.000,00/);
    expect(within(ars).queryByTestId("budget-available-USD-2026-09")).toBeNull();
  });
});
