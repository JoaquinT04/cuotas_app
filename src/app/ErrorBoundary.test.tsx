import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "../data/db";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("muestra pantalla de error con acciones", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary db={createDb(`test-${crypto.randomUUID()}`)}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar backup" })).toBeInTheDocument();
  });
});
