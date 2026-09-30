import { describe, expect, it } from "vitest";

describe("setup de tests", () => {
  it("tiene IndexedDB simulado y randomUUID", () => {
    expect(globalThis.indexedDB).toBeDefined();
    expect(typeof crypto.randomUUID()).toBe("string");
  });
});
