import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { PurchaseForm } from "./PurchaseForm";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

async function setup(onSaved = vi.fn()) {
  const user = userEvent.setup();
  const r = renderApp(<PurchaseForm onSaved={onSaved} />);
  await r.repos.cards.put(makeCard({ id: "visa", name: "Visa", closingDay: 25 }));
  await screen.findByRole("option", { name: "Visa" });
  return { user, onSaved, ...r };
}

describe("PurchaseForm", () => {
  it("sugiere el mes de la primera cuota según el cierre", async () => {
    await setup();
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-10");
    expect(screen.getByText("Sugerido según el cierre de la tarjeta")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fecha de compra"), { target: { value: "2026-09-26" } });
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-11");
  });

  it("el mes editado a mano prevalece", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Mes de la 1ra cuota"), { target: { value: "2026-12" } });
    fireEvent.change(screen.getByLabelText("Fecha de compra"), { target: { value: "2026-09-26" } });
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-12");
  });

  it("carga por total y guarda el valor de la cuota", async () => {
    const { user, onSaved, repos } = await setup();
    await user.type(screen.getByLabelText("Descripción"), "Heladera");
    await user.clear(screen.getByLabelText("Cantidad de cuotas"));
    await user.type(screen.getByLabelText("Cantidad de cuotas"), "12");
    await user.selectOptions(screen.getByLabelText("Cargar como"), "total");
    await user.type(screen.getByLabelText("Monto total"), "120.000");
    expect(screen.getByText(/12 cuotas de .*10\.000,00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar compra" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [saved] = await repos.purchases.list();
    expect(saved).toMatchObject({
      cardId: "visa",
      description: "Heladera",
      installmentsCount: 12,
      installmentAmount: 1000000,
      firstMonth: "2026-10",
      purchaseDate: "2026-09-10",
    });
  });

  it("muestra Monto inválido y no guarda", async () => {
    const { user, onSaved, repos } = await setup();
    await user.type(screen.getByLabelText("Descripción"), "Algo");
    await user.type(screen.getByLabelText("Valor de la cuota"), "abc");
    await user.click(screen.getByRole("button", { name: "Guardar compra" }));
    expect(await screen.findByText("Monto inválido")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(await repos.purchases.list()).toEqual([]);
  });

  it("vista previa avisa meses en negativo", async () => {
    const { user, repos } = await setup();
    await repos.incomes.put(makeIncome({ amount: 500000, startMonth: "2026-01" }));
    await user.type(screen.getByLabelText("Descripción"), "Tele");
    await user.type(screen.getByLabelText("Valor de la cuota"), "10.000");
    expect(await screen.findByText(/1 mes queda en negativo/)).toBeInTheDocument();
  });

  it("edición no duplica la compra original en la vista previa", async () => {
    const user = userEvent.setup();
    const original = makePurchase({ id: "p1", cardId: "visa", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 100000 });
    const r = renderApp(<PurchaseForm initial={original} onSaved={vi.fn()} />);
    await r.repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await r.repos.incomes.put(makeIncome({ amount: 300000 }));
    await r.repos.purchases.put(original);
    await screen.findByRole("option", { name: "Visa" });
    expect(await screen.findByText(/Todos los meses quedan en positivo/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Valor de la cuota"));
    await user.type(screen.getByLabelText("Valor de la cuota"), "2500");
    expect(await screen.findByText(/Todos los meses quedan en positivo/)).toBeInTheDocument();
  });
});
