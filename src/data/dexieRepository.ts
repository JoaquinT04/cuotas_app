import { liveQuery, type EntityTable } from "dexie";
import type { Entity } from "../domain/schemas";
import type { Repository } from "./repository";

export function createDexieRepository<T extends Entity>(table: EntityTable<T, "id">): Repository<T> {
  const list = async () => (await table.toArray()).filter((e) => !e.deletedAt);

  return {
    list,
    async get(id) {
      const e = await table.get(id as never);
      return e && !e.deletedAt ? e : undefined;
    },
    async put(entity) {
      await table.put({ ...entity, updatedAt: new Date().toISOString() });
    },
    async remove(id) {
      const e = await table.get(id as never);
      if (!e || e.deletedAt) return;
      const ts = new Date().toISOString();
      await table.put({ ...e, deletedAt: ts, updatedAt: ts });
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
