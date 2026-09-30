import { useState } from "react";
import { useCards, usePurchases, useToday } from "../../app/hooks";
import { isFinished } from "../../domain/installments";
import { GanttChart } from "./GanttChart";
import { PurchaseList } from "./PurchaseList";

type Filter = "active" | "finished" | "all";
type View = "list" | "gantt";

const filters: { value: Filter; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "finished", label: "Terminadas" },
  { value: "all", label: "Todas" },
];

const pill = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`;

export function PurchasesPage() {
  const purchases = usePurchases();
  const cards = useCards();
  const { month } = useToday();
  const [filter, setFilter] = useState<Filter>("active");
  const [view, setView] = useState<View>("list");

  if (!purchases || !cards) return <p>Cargando…</p>;

  const active = purchases.filter((p) => !isFinished(p, month));
  const visible = purchases
    .filter((p) => (filter === "all" ? true : filter === "active" ? !isFinished(p, month) : isFinished(p, month)))
    .sort((a, b) => a.firstMonth.localeCompare(b.firstMonth));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Compras</h1>
        <div className="flex gap-1" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === "list"} className={pill(view === "list")} onClick={() => setView("list")}>Lista</button>
          <button type="button" aria-pressed={view === "gantt"} className={pill(view === "gantt")} onClick={() => setView("gantt")}>Gantt</button>
        </div>
      </div>
      {view === "list" ? (
        <>
          <div className="flex gap-2" role="group" aria-label="Filtro">
            {filters.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} className={pill(filter === f.value)} onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <PurchaseList purchases={visible} cards={cards} current={month} />
        </>
      ) : (
        <GanttChart purchases={active} cards={cards} from={month} />
      )}
    </>
  );
}
