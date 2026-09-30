import { z } from "zod";
import { todayIso } from "../domain/month";
import {
  budgetCategorySchema, cardSchema, fixedExpenseSchema, incomeSchema, purchaseSchema,
} from "../domain/schemas";
import { SCHEMA_VERSION, setLastBackupAt, type CuotasDB, type Meta } from "./db";

const backupDataSchema = z.object({
  cards: z.array(cardSchema),
  purchases: z.array(purchaseSchema),
  incomes: z.array(incomeSchema),
  fixedExpenses: z.array(fixedExpenseSchema),
  categories: z.array(budgetCategorySchema),
});
export type BackupData = z.infer<typeof backupDataSchema>;

const envelopeSchema = z.object({
  app: z.literal("cuotas-app"),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.unknown(),
});

export interface BackupFile {
  app: "cuotas-app";
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

/** MIGRATIONS[n] transforma los datos de la versión n a la n + 1. */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {};

export function parseBackup(raw: unknown): ParseResult {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return { ok: false, error: "El archivo no es un backup de Cuotas." };
  const { schemaVersion, exportedAt } = envelope.data;
  if (schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: "Backup de una versión más nueva de la app. Actualizá la app e intentá de nuevo.",
    };
  }
  let data = envelope.data.data;
  for (let v = schemaVersion; v < SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, error: `No se puede migrar desde la versión ${v}.` };
    data = migrate(data);
  }
  const parsed = backupDataSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "El backup tiene datos inválidos." };
  return {
    ok: true,
    backup: { app: "cuotas-app", schemaVersion: SCHEMA_VERSION, exportedAt, data: parsed.data },
  };
}

export function parseBackupText(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
  return parseBackup(raw);
}

export async function exportBackup(db: CuotasDB, now: Date = new Date()): Promise<BackupFile> {
  const data: BackupData = {
    cards: await db.cards.toArray(),
    purchases: await db.purchases.toArray(),
    incomes: await db.incomes.toArray(),
    fixedExpenses: await db.fixedExpenses.toArray(),
    categories: await db.categories.toArray(),
  };
  await setLastBackupAt(db, now.toISOString());
  return { app: "cuotas-app", schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export async function importBackup(db: CuotasDB, backup: BackupFile): Promise<void> {
  const { data } = backup;
  await db.transaction(
    "rw",
    [db.cards, db.purchases, db.incomes, db.fixedExpenses, db.categories],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.purchases.clear(),
        db.incomes.clear(),
        db.fixedExpenses.clear(),
        db.categories.clear(),
      ]);
      await db.cards.bulkPut(data.cards);
      await db.purchases.bulkPut(data.purchases);
      await db.incomes.bulkPut(data.incomes);
      await db.fixedExpenses.bulkPut(data.fixedExpenses);
      await db.categories.bulkPut(data.categories);
    },
  );
}

export function backupSummary(backup: BackupFile): Record<keyof BackupData, number> {
  const live = (rows: { deletedAt?: string }[]) => rows.filter((r) => !r.deletedAt).length;
  const { data } = backup;
  return {
    cards: live(data.cards),
    purchases: live(data.purchases),
    incomes: live(data.incomes),
    fixedExpenses: live(data.fixedExpenses),
    categories: live(data.categories),
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `cuotas-backup-${todayIso(now)}.json`;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldRemindBackup(meta: Meta, hasData: boolean, now: Date): boolean {
  if (!hasData) return false;
  if (!meta.lastBackupAt) return true;
  return now.getTime() - Date.parse(meta.lastBackupAt) > THIRTY_DAYS_MS;
}
