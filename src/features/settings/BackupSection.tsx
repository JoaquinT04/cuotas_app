import { useId, useState, type ChangeEvent } from "react";
import { useAction, useAppData, useMeta } from "../../app/hooks";
import {
  backupFileName, backupSummary, exportBackup, importBackup, parseBackupText, type BackupFile,
} from "../../data/backup";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { downloadJson } from "../../ui/download";
import { Panel } from "../../ui/Panel";
import { buttonClass, dangerButtonClass, secondaryButtonClass } from "../../ui/styles";

export function BackupSection() {
  const id = useId();
  const { db } = useAppData();
  const meta = useMeta();
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportAction = useAction(async () => {
    downloadJson(backupFileName(), await exportBackup(db));
    setMessage("Backup exportado.");
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
    downloadJson(`antes-de-importar-${backupFileName()}`, await exportBackup(db));
    await importBackup(db, pending);
    setPending(null);
    setMessage("Datos importados.");
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
            (antes se descarga una copia de lo que tenés).
          </p>
          <div className="flex gap-2">
            <ConfirmButton label="Reemplazar mis datos" className={dangerButtonClass} onConfirm={confirmImport} />
            <button type="button" className={secondaryButtonClass} onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
