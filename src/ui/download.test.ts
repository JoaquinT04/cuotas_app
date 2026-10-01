import { afterEach, describe, expect, it, vi } from "vitest";
import { isAbortError, saveJson } from "./download";

function stubNavigator(share: Partial<Navigator>) {
  for (const [k, v] of Object.entries(share)) {
    Object.defineProperty(navigator, k, { value: v, configurable: true });
  }
}

afterEach(() => {
  for (const k of ["canShare", "share"]) delete (navigator as unknown as Record<string, unknown>)[k];
  vi.restoreAllMocks();
});

function stubAnchorDownload() {
  Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:x"), configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  return vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

describe("saveJson", () => {
  it("usa la hoja de compartir si el navegador puede compartir archivos", async () => {
    const share = vi.fn(async () => {});
    stubNavigator({ canShare: () => true, share });
    const click = stubAnchorDownload();
    await saveJson("b.json", { a: 1 });
    expect(share).toHaveBeenCalledTimes(1);
    const [{ files, title }] = share.mock.calls[0] as unknown as [{ files: File[]; title: string }];
    expect(title).toBe("b.json");
    expect(files[0].name).toBe("b.json");
    expect(JSON.parse(await files[0].text())).toEqual({ a: 1 });
    expect(click).not.toHaveBeenCalled();
  });

  it("si la persona cancela, propaga el AbortError", async () => {
    const err = new DOMException("cancelado", "AbortError");
    stubNavigator({ canShare: () => true, share: () => Promise.reject(err) });
    stubAnchorDownload();
    await expect(saveJson("b.json", {})).rejects.toBe(err);
    expect(isAbortError(err)).toBe(true);
  });

  it("si compartir falla por otro motivo, descarga el archivo", async () => {
    stubNavigator({ canShare: () => true, share: () => Promise.reject(new DOMException("no", "NotAllowedError")) });
    const click = stubAnchorDownload();
    await saveJson("b.json", {});
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("sin Web Share descarga con un enlace", async () => {
    const click = stubAnchorDownload();
    await saveJson("b.json", {});
    expect(click).toHaveBeenCalledTimes(1);
  });
});
