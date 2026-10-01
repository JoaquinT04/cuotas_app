export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Guarda un JSON. En una PWA instalada en iOS la descarga con <a download> puede fallar en silencio,
 * así que si el navegador puede compartir archivos usamos la hoja de compartir.
 * Si la persona cancela se propaga el AbortError para no dar el backup por hecho.
 */
export async function saveJson(filename: string, data: unknown): Promise<void> {
  const file = new File([JSON.stringify(data, null, 2)], filename, { type: "application/json" });
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err) {
      if (isAbortError(err)) throw err;
      // Otro error (p. ej. NotAllowedError por falta de gesto reciente): probamos con la descarga.
    }
  }
  downloadFile(file);
}
