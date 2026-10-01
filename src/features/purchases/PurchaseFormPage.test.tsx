import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { confirmTap } from "../../test/confirm";
import { makeCard, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { PurchaseFormPage } from "./PurchaseFormPage";

describe("PurchaseFormPage", () => {
  it("eliminar vuelve al listado sin mostrar 'No se encontró la compra.'", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(
      <Routes>
        <Route path="/compras" element={<p>Listado</p>} />
        <Route path="/compras/:id" element={<PurchaseFormPage />} />
      </Routes>,
      { route: "/compras/p1" },
    );
    await repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await repos.purchases.put(makePurchase({ id: "p1", cardId: "visa", description: "Tele" }));
    const button = await screen.findByRole("button", { name: "Eliminar compra" });

    let flashed = false;
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes("No se encontró la compra.")) flashed = true;
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    await confirmTap(user, button);
    expect(await screen.findByText("Listado")).toBeInTheDocument();
    await waitFor(async () => expect(await repos.purchases.list()).toEqual([]));
    observer.disconnect();
    expect(flashed).toBe(false);
  });
});
