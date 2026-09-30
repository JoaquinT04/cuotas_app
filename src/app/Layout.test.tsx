import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "../data/db";
import { StorageBanner } from "./StorageBanner";
import { AppRoutes } from "../routes";
import { renderApp } from "../test/render";

describe("Layout", () => {
  it("muestra navegación inferior", () => {
    renderApp(<AppRoutes />);
    for (const name of ["Inicio", "Compras", "Presupuesto", "Ajustes"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("muestra botón de nueva compra en Inicio y no en Ajustes", () => {
    const { unmount } = renderApp(<AppRoutes />);
    expect(screen.getByRole("link", { name: "Nueva compra" })).toBeInTheDocument();
    unmount();
    renderApp(<AppRoutes />, { route: "/ajustes" });
    expect(screen.queryByRole("link", { name: "Nueva compra" })).toBeNull();
  });

  it("no muestra aviso de almacenamiento si IndexedDB funciona", async () => {
    renderApp(<AppRoutes />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/No se pueden guardar datos/)).toBeNull();
  });

  it("muestra aviso si IndexedDB no está disponible", async () => {
    const db = createDb(`test-${crypto.randomUUID()}`);
    vi.spyOn(db, "open").mockRejectedValue(new Error("x"));
    renderApp(<StorageBanner />, { db });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pueden guardar datos en este navegador (¿modo incógnito?).",
    );
  });
});
