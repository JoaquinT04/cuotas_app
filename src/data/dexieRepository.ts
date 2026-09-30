import { liveQuery, type EntityTable } from "dexie";
import type { Entity } from "../domain/schemas";
import type { Repository } from "./repository";

export function createDexieRepository<T extends Entity>(table: EntityTable<T, "id">): Repository<T> {
  const list = async () => (await table.toArray()).filter((e) => !e.deletedAt);

  return {
    list,
    async get(id) {
      // `as never`: Dexie v4 IDType<T, "id"> no se resuelve para un T genérico.
      const e = await table.get(id as never);
      return e && !e.deletedAt ? e : undefined;
    },
    async put(entity) {
      await table.db.transaction("rw", table, async () => {
        const existing = await table.get(entity.id as never);
        const next = { ...entity, updatedAt: new Date().toISOString() };
        // Una copia vieja no debe resucitar un registro borrado.
        if (existing?.deletedAt) next.deletedAt = existing.deletedAt;
        await table.put(next);
      });
    },
    async remove(id) {
      await table.db.transaction("rw", table, async () => {
        const e = await table.get(id as never);
        if (!e || e.deletedAt) return;
        const ts = new Date().toISOString();
        await table.put({ ...e, deletedAt: ts, updatedAt: ts });
      });
    },
    subscribe(cb) {
      const sub = liveQuery(list).subscribe({
        next: cb,
        error: (err: unknown) => console.error(err),
      });
      return () => sub.unsubscribe();
    },
  };
}
