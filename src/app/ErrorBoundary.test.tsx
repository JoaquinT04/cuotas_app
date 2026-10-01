import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as backup from "../data/backup";
import { createDb } from "../data/db";
import { saveJson } from "../ui/download";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("../ui/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../ui/download")>()),
  saveJson: vi.fn(async () => {}),
}));

function Boom(): never {
  throw new Error("boom");
}

function setup() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary db={createDb(`test-${crypto.randomUUID()}`)}>
      <Boom />
    </ErrorBoundary>,
  );
}

describe("ErrorBoundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("muestra pantalla de error con acciones", () => {
    setup();
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar backup" })).toBeInTheDocument();
  });

  it("exporta el backup al tocar Exportar backup", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Exportar backup" }));
    await vi.waitFor(() => expect(saveJson).toHaveBeenCalled());
    expect(vi.mocked(saveJson).mock.calls[0]![0]).toMatch(/^cuotas-backup-.*\.json$/);
  });

  it("avisa si la exportación falla", async () => {
    setup();
    vi.spyOn(backup, "saveBackup").mockRejectedValue(new Error("x"));
    await userEvent.click(screen.getByRole("button", { name: "Exportar backup" }));
    expect(await screen.findByText("No se pudo exportar el backup.")).toBeInTheDocument();
  });
});
