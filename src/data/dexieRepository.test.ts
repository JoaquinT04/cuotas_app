import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard } from "../test/factories";
import { createDb, getMeta, setLastBackupAt, SCHEMA_VERSION, type CuotasDB } from "./db";
import { createDexieRepository } from "./dexieRepository";
import { newEntity, type Repository } from "./repository";
import type { Card } from "../domain/schemas";

let db: CuotasDB;
let repo: Repository<Card>;

beforeEach(() => {
  db = createDb(`test-${crypto.randomUUID()}`);
  repo = createDexieRepository(db.cards);
});

afterEach(async () => {
  await db.delete();
});

describe("newEntity", () => {
  it("agrega id y timestamps", () => {
    const e = newEntity({ name: "x" }, new Date("2026-09-30T10:00:00.000Z"));
    expect(e.id).toMatch(/[0-9a-f-]{36}/);
    expect(e.createdAt).toBe("2026-09-30T10:00:00.000Z");
    expect(e.updatedAt).toBe(e.createdAt);
    expect(e.name).toBe("x");
  });
});

describe("dexie repository", () => {
  it("put, get y list", async () => {
    const card = makeCard();
    await repo.put(card);
    expect((await repo.get(card.id))?.name).toBe("Visa");
    expect(await repo.list()).toHaveLength(1);
  });

  it("put actualiza updatedAt", async () => {
    const card = makeCard({ updatedAt: "2000-01-01T00:00:00.000Z" });
    await repo.put(card);
    expect((await repo.get(card.id))?.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });

  it("remove es borrado lógico", async () => {
    const card = makeCard();
    await repo.put(card);
    await repo.remove(card.id);
    expect(await repo.list()).toEqual([]);
    expect(await repo.get(card.id)).toBeUndefined();
    const raw = await db.cards.get(card.id);
    expect(raw?.deletedAt).toBeDefined();
  });

  it("subscribe emite cambios", async () => {
    const seen: Card[][] = [];
    const unsubscribe = repo.subscribe((items) => seen.push(items));
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await repo.put(makeCard({ name: "Master" }));
    await vi.waitFor(() => expect(seen.at(-1)?.map((c) => c.name)).toEqual(["Master"]));
    unsubscribe();
  });
});

describe("meta", () => {
  it("default y lastBackupAt", async () => {
    expect(await getMeta(db)).toEqual({ key: "meta", schemaVersion: SCHEMA_VERSION });
    await setLastBackupAt(db, "2026-09-30T00:00:00.000Z");
    expect((await getMeta(db)).lastBackupAt).toBe("2026-09-30T00:00:00.000Z");
  });
});
