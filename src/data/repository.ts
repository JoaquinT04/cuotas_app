import type { Entity } from "../domain/schemas";

/** Contrato estable. v3 agrega una implementación nube sin cambiar la UI ni el dominio. */
export interface Repository<T extends Entity> {
  /** Excluye borrados lógicos. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  /** Crea o actualiza. Setea updatedAt. */
  put(entity: T): Promise<void>;
  /** Borrado lógico: setea deletedAt. */
  remove(id: string): Promise<void>;
  subscribe(cb: (items: T[]) => void): () => void;
}

export function newEntity<F extends object>(fields: F, now: Date = new Date()): F & Entity {
  const ts = now.toISOString();
  return { ...fields, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts };
}
