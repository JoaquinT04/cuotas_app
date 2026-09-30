import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/render";
import { makeCard, makePurchase } from "../../test/factories";
import { CardsSection } from "./CardsSection";

describe("CardsSection", () => {
  it("agrega una tarjeta", async () => {
    const user = userEvent.setup();
    renderApp(<CardsSection />);
    await user.click(await screen.findByRole("button", { name: "Agregar tarjeta" }));
    await user.type(screen.getByLabelText("Nombre"), "Visa Galicia");
    await user.type(screen.getByLabelText("Día de cierre"), "25");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Visa Galicia")).toBeInTheDocument();
    expect(screen.getByText(/cierra día 25/)).toBeInTheDocument();
  });

  it("valida nombre obligatorio y día fuera de rango", async () => {
    const user = userEvent.setup();
    renderApp(<CardsSection />);
    await user.click(await screen.findByRole("button", { name: "Agregar tarjeta" }));
    await user.type(screen.getByLabelText("Día de cierre"), "40");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Entre 1 y 31")).toBeInTheDocument();
  });

  it("bloquea borrar con cuotas pendientes y permite archivar", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<CardsSection />);
    const card = makeCard({ name: "Master" });
    await repos.cards.put(card);
    await repos.purchases.put(makePurchase({ cardId: card.id, firstMonth: "2099-01" }));
    await user.click(await screen.findByRole("button", { name: "Borrar" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    expect(await screen.findByText(/tiene cuotas pendientes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archivar tarjeta" }));
    expect(await screen.findByText("archivada")).toBeInTheDocument();
  });

  it("borrar tarjeta y sus compras no deja cuotas huérfanas", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<CardsSection />);
    const card = makeCard({ name: "Amex" });
    await repos.cards.put(card);
    await repos.purchases.put(makePurchase({ cardId: card.id, firstMonth: "2099-01" }));
    await user.click(await screen.findByRole("button", { name: "Borrar" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    await user.click(await screen.findByRole("button", { name: "Borrar tarjeta y sus compras" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    await waitFor(async () => {
      expect(await repos.cards.list()).toEqual([]);
      expect(await repos.purchases.list()).toEqual([]);
    });
  });
});
