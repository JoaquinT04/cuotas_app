import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeCard } from "../../test/factories";
import { confirmTap } from "../../test/confirm";
import { renderApp } from "../../test/render";
import { getPreImportSnapshot } from "../../data/backup";
import { getMeta, SCHEMA_VERSION } from "../../data/db";
import { saveJson } from "../../ui/download";
import { BackupSection } from "./BackupSection";

vi.mock("../../ui/download", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ui/download")>()),
  saveJson: vi.fn(async () => {}),
}));

afterEach(() => {
  vi.mocked(saveJson).mockReset();
  vi.mocked(saveJson).mockImplementation(async () => {});
});

function file(content: string) {
  return new File([content], "backup.json", { type: "application/json" });
}

function backupWith(name: string) {
  return {
    app: "cuotas-app",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-09-30T00:00:00.000Z",
    data: { cards: [makeCard({ name })], purchases: [], incomes: [], fixedExpenses: [], categories: [] },
  };
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
    await user.upload(screen.getByLabelText("Importar backup"), file(JSON.stringify(backupWith("Nueva"))));
    expect(await screen.findByText(/1 tarjetas/)).toBeInTheDocument();
    await confirmTap(user, screen.getByRole("button", { name: "Reemplazar mis datos" }));
    expect(await screen.findByText("Datos importados.")).toBeInTheDocument();
    expect((await repos.cards.list()).map((c) => c.name)).toEqual(["Nueva"]);
  });

  it("exportar marca el último backup sólo después de guardar", async () => {
    const user = userEvent.setup();
    const { db } = renderApp(<BackupSection />);
    await user.click(screen.getByRole("button", { name: "Exportar backup" }));
    expect(await screen.findByText("Backup exportado.")).toBeInTheDocument();
    expect(saveJson).toHaveBeenCalledWith(expect.stringMatching(/^cuotas-backup-.*\.json$/), expect.anything());
    expect((await getMeta(db)).lastBackupAt).toBeDefined();
  });

  it("si se cancela el guardado no marca el backup ni muestra error", async () => {
    vi.mocked(saveJson).mockRejectedValue(new DOMException("cancelado", "AbortError"));
    const user = userEvent.setup();
    const { db } = renderApp(<BackupSection />);
    await user.click(screen.getByRole("button", { name: "Exportar backup" }));
    await waitFor(() => expect(saveJson).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Exportar backup" })).toBeEnabled());
    expect((await getMeta(db)).lastBackupAt).toBeUndefined();
    expect(screen.queryByText("Backup exportado.")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("importar guarda una copia previa en el teléfono y se puede restaurar", async () => {
    const user = userEvent.setup();
    const { repos, db } = renderApp(<BackupSection />);
    await repos.cards.put(makeCard({ name: "Vieja" }));
    await user.upload(screen.getByLabelText("Importar backup"), file(JSON.stringify(backupWith("Nueva"))));
    await confirmTap(user, await screen.findByRole("button", { name: "Reemplazar mis datos" }));
    expect(await screen.findByText("Datos importados.")).toBeInTheDocument();
    expect(saveJson).toHaveBeenCalledWith(expect.stringMatching(/^antes-de-importar-/), expect.anything());
    expect((await getPreImportSnapshot(db))?.data.cards.map((c) => c.name)).toEqual(["Vieja"]);
    expect((await getMeta(db)).lastBackupAt).toBeDefined();

    const restore = await screen.findByRole("button", { name: "Restaurar copia previa a la última importación" });
    await confirmTap(user, restore);
    expect(await screen.findByText("Copia previa restaurada.")).toBeInTheDocument();
    await waitFor(async () => expect((await repos.cards.list()).map((c) => c.name)).toEqual(["Vieja"]));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Restaurar copia previa a la última importación" })).toBeNull(),
    );
    expect(await getPreImportSnapshot(db)).toBeUndefined();
  });
});
