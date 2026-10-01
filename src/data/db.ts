import Dexie, { type EntityTable, type Table } from "dexie";
import type { BudgetCategory, Card, FixedExpense, Income, Purchase } from "../domain/schemas";

export const SCHEMA_VERSION = 1;

export interface Meta {
  key: "meta";
  schemaVersion: number;
  lastBackupAt?: string;
}

export const PRE_IMPORT_SNAPSHOT_KEY = "preImportSnapshot";

/** Copia de los datos tomada justo antes de la última importación (se valida al leerla). */
export interface PreImportSnapshotRow {
  key: typeof PRE_IMPORT_SNAPSHOT_KEY;
  backup: unknown;
}

export type MetaRow = Meta | PreImportSnapshotRow;

export type CuotasDB = Dexie & {
  cards: EntityTable<Card, "id">;
  purchases: EntityTable<Purchase, "id">;
  incomes: EntityTable<Income, "id">;
  fixedExpenses: EntityTable<FixedExpense, "id">;
  categories: EntityTable<BudgetCategory, "id">;
  // Table y no EntityTable: InsertType no se distribuye sobre la unión de filas.
  meta: Table<MetaRow, MetaRow["key"]>;
};

export function createDb(name = "cuotas"): CuotasDB {
  const db = new Dexie(name) as CuotasDB;
  // Migraciones futuras: agregar db.version(2).stores(...).upgrade(...) sin tocar la versión 1.
  db.version(1).stores({
    cards: "id",
    purchases: "id, cardId",
    incomes: "id",
    fixedExpenses: "id",
    categories: "id",
    meta: "key",
  });
  return db;
}

export async function getMeta(db: CuotasDB): Promise<Meta> {
  const row = await db.meta.get("meta");
  return row?.key === "meta" ? row : { key: "meta", schemaVersion: SCHEMA_VERSION };
}

export async function setLastBackupAt(db: CuotasDB, iso: string): Promise<void> {
  const meta = await getMeta(db);
  await db.meta.put({ ...meta, lastBackupAt: iso });
}
