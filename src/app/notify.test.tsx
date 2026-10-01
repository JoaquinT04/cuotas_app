import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/render";

describe("NotifyProvider", () => {
  it("muestra un aviso ante una promesa rechazada sin manejar", async () => {
    renderApp(<p>app</p>);
    act(() => {
      window.dispatchEvent(new Event("unhandledrejection"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Algo no se pudo guardar. Probá de nuevo.");
  });
});
