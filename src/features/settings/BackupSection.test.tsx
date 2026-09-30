import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeCard } from "../../test/factories";
import { renderApp } from "../../test/render";
import { SCHEMA_VERSION } from "../../data/db";
import { BackupSection } from "./BackupSection";

vi.mock("../../ui/download", () => ({ downloadJson: vi.fn() }));

function file(content: string) {
  return new File([content], "backup.json", { type: "application/json" });
}

describe("BackupSection", () => {
  it("archivo inválido muestra error y no toca los datos", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BackupSection />);
    await repos.cards.put(makeCard({ name: "Visa" }));
    await user.upload(screen.getByLabelText("Importar backup"), file("{\"foo\":1}"));
    expect(await screen.findByText("El archivo no es un backup de Cuotas.")).toBeInTheDocument();
    expect(await repos.cards.list()).toHaveLength(1);
  });

  it("archivo válido muestra resumen y reemplaza al confirmar", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BackupSection />);
    await repos.cards.put(makeCard({ name: "Vieja" }));
    const backup = {
      app: "cuotas-app",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-09-30T00:00:00.000Z",
      data: { cards: [makeCard({ name: "Nueva" })], purchases: [], incomes: [], fixedExpenses: [], categories: [] },
    };
    await user.upload(screen.getByLabelText("Importar backup"), file(JSON.stringify(backup)));
    expect(await screen.findByText(/1 tarjetas/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reemplazar mis datos" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    expect(await screen.findByText("Datos importados.")).toBeInTheDocument();
    expect((await repos.cards.list()).map((c) => c.name)).toEqual(["Nueva"]);
  });
});
