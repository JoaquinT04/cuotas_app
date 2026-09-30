import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeCard, makePurchase } from "../test/factories";
import {
  backupFileName, backupSummary, exportBackup, importBackup, parseBackup, parseBackupText,
  shouldRemindBackup,
} from "./backup";
import { createDb, getMeta, SCHEMA_VERSION, type CuotasDB } from "./db";

let db: CuotasDB;
let other: CuotasDB;

beforeEach(() => {
  db = createDb(`test-${crypto.randomUUID()}`);
  other = createDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
  await other.delete();
});

describe("exportBackup", () => {
  it("incluye todo (también borrados) y registra lastBackupAt", async () => {
    await db.cards.put(makeCard());
    await db.purchases.put(makePurchase({ deletedAt: "2026-01-02T00:00:00.000Z" }));
    const now = new Date("2026-09-30T12:00:00.000Z");
    const backup = await exportBackup(db, now);
    expect(backup.app).toBe("cuotas-app");
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    expect(backup.data.cards).toHaveLength(1);
    expect(backup.data.purchases).toHaveLength(1);
    expect((await getMeta(db)).lastBackupAt).toBe(now.toISOString());
  });
});

describe("ida y vuelta", () => {
  it("importar reemplaza los datos existentes", async () => {
    const card = makeCard({ name: "Naranja" });
    await db.cards.put(card);
    await other.cards.put(makeCard({ name: "Vieja" }));
    const parsed = parseBackup(JSON.parse(JSON.stringify(await exportBackup(db))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await importBackup(other, parsed.backup);
    const names = (await other.cards.toArray()).map((c) => c.name);
    expect(names).toEqual(["Naranja"]);
  });
});

describe("parseBackup", () => {
  const valid = {
    app: "cuotas-app",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-09-30T00:00:00.000Z",
    data: { cards: [], purchases: [], incomes: [], fixedExpenses: [], categories: [] },
  };

  it("acepta backup válido", () => {
    expect(parseBackup(valid).ok).toBe(true);
  });
  it("rechaza texto que no es JSON", () => {
    expect(parseBackupText("hola")).toEqual({ ok: false, error: "El archivo no es un JSON válido." });
  });
  it("rechaza JSON ajeno", () => {
    expect(parseBackup({ foo: 1 })).toEqual({ ok: false, error: "El archivo no es un backup de Cuotas." });
  });
  it("rechaza versión más nueva", () => {
    const r = parseBackup({ ...valid, schemaVersion: SCHEMA_VERSION + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/versión más nueva/);
  });
  it("rechaza datos inválidos", () => {
    const bad = { ...valid, data: { ...valid.data, purchases: [makePurchase({ installmentsCount: 0 })] } };
    expect(parseBackup(bad)).toEqual({ ok: false, error: "El backup tiene datos inválidos." });
  });
});

describe("backupSummary", () => {
  it("cuenta sólo registros no borrados", async () => {
    await db.cards.put(makeCard());
    await db.cards.put(makeCard({ deletedAt: "x" }));
    const summary = backupSummary(await exportBackup(db));
    expect(summary.cards).toBe(1);
    expect(summary.purchases).toBe(0);
  });
});

describe("backupFileName", () => {
  it("usa la fecha local", () => {
    expect(backupFileName(new Date(2026, 8, 30))).toBe("cuotas-backup-2026-09-30.json");
  });
});

describe("shouldRemindBackup", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  it("no recuerda sin datos", () => {
    expect(shouldRemindBackup({ key: "meta", schemaVersion: 1 }, false, now)).toBe(false);
  });
  it("recuerda si nunca hubo backup", () => {
    expect(shouldRemindBackup({ key: "meta", schemaVersion: 1 }, true, now)).toBe(true);
  });
  it("recuerda pasados 30 días", () => {
    const meta = { key: "meta" as const, schemaVersion: 1 };
    expect(shouldRemindBackup({ ...meta, lastBackupAt: "2026-08-15T00:00:00.000Z" }, true, now)).toBe(true);
    expect(shouldRemindBackup({ ...meta, lastBackupAt: "2026-09-10T00:00:00.000Z" }, true, now)).toBe(false);
  });
});
