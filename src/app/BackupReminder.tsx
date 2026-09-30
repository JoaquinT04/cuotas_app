import { Link } from "react-router";
import { shouldRemindBackup } from "../data/backup";
import { useCards, useMeta, usePurchases } from "./hooks";

export function BackupReminder() {
  const meta = useMeta();
  const cards = useCards();
  const purchases = usePurchases();
  if (!meta || !cards || !purchases) return null;
  if (!shouldRemindBackup(meta, cards.length + purchases.length > 0, new Date())) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      Hace más de 30 días que no hacés backup (o nunca hiciste).{" "}
      <Link to="/ajustes" className="font-semibold underline">Exportar ahora</Link>
    </div>
  );
}
