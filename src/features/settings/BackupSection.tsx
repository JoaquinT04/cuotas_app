import { useId, useState, type ChangeEvent } from "react";
import { useAction, useAppData, useHasPreImportSnapshot, useMeta } from "../../app/hooks";
import {
  backupFileName, backupSummary, importBackup, parseBackupText, restorePreImportSnapshot, saveBackup,
  type BackupFile,
} from "../../data/backup";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { isAbortError, saveJson } from "../../ui/download";
import { Panel } from "../../ui/Panel";
import { buttonClass, dangerButtonClass, secondaryButtonClass } from "../../ui/styles";

export function BackupSection() {
  const id = useId();
  const { db } = useAppData();
  const meta = useMeta();
  const hasSnapshot = useHasPreImportSnapshot();
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** Exporta y guarda; devuelve undefined si la persona canceló el guardado. */
  async function saveCopy(filename: string): Promise<BackupFile | undefined> {
    try {
      return await saveBackup(db, saveJson, filename);
    } catch (err) {
      if (isAbortError(err)) return undefined;
      throw err;
    }
  }

  const exportAction = useAction(async () => {
    if (await saveCopy(backupFileName())) setMessage("Backup exportado.");
  }, "No se pudo exportar el backup.");

  const readFile = useAction(async (selected: File) => {
    const result = parseBackupText(await selected.text());
    setMessage(null);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    setError(null);
    setPending(result.backup);
  }, "No se pudo leer el archivo.");

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const selected = input.files?.[0];
    input.value = "";
    if (selected) void readFile.run(selected);
  }

  async function confirmImport() {
    if (!pending) return;
    // Si no se pudo guardar la copia (o se canceló) no importamos nada.
    const snapshot = await saveCopy(`antes-de-importar-${backupFileName()}`);
    if (!snapshot) return;
    await importBackup(db, pending, snapshot);
    setPending(null);
    setMessage("Datos importados.");
  }

  async function restoreSnapshot() {
    await restorePreImportSnapshot(db);
    setPending(null);
    setMessage("Copia previa restaurada.");
  }

  const summary = pending ? backupSummary(pending) : null;

  return (
    <Panel title="Backup">
      <p className="text-sm text-slate-500">
        Tus datos viven sólo en este teléfono. Exportá un backup seguido.
        {meta?.lastBackupAt && ` Último: ${new Date(meta.lastBackupAt).toLocaleDateString("es-AR")}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={exportAction.pending} onClick={() => void exportAction.run()}>
          Exportar backup
        </button>
        <label htmlFor={`${id}-file`} className={`${secondaryButtonClass} cursor-pointer`}>
          Importar backup
        </label>
        <input id={`${id}-file`} type="file" accept="application/json,.json" className="sr-only" onChange={handleFile} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      {pending && summary && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">
          <p>
            El backup tiene {summary.cards} tarjetas, {summary.purchases} compras, {summary.incomes} ingresos,{" "}
            {summary.fixedExpenses} gastos fijos y {summary.categories} categorías. Reemplaza todos tus datos actuales
            (antes se guarda una copia de lo que tenés).
          </p>
          <div className="flex gap-2">
            <ConfirmButton
              label="Reemplazar mis datos"
              className={dangerButtonClass}
              onConfirm={confirmImport}
              failMessage="No se pudo importar el backup."
            />
            <button type="button" className={secondaryButtonClass} onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {hasSnapshot && (
        <ConfirmButton
          label="Restaurar copia previa a la última importación"
          className={secondaryButtonClass}
          onConfirm={restoreSnapshot}
          failMessage="No se pudo restaurar la copia previa."
        />
      )}
    </Panel>
  );
}
