import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
