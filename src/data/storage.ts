import type { CuotasDB } from "./db";

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStorageAvailable(db: CuotasDB): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch {
    return false;
  }
}
