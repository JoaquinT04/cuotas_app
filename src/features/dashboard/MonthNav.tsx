import { addMonths, formatMonth, type Month } from "../../domain/month";

export function MonthNav({ month, onChange }: { month: Month; onChange: (m: Month) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label="Mes anterior" className="px-3 py-1 text-xl" onClick={() => onChange(addMonths(month, -1))}>◀</button>
      <h1 className="text-lg font-bold capitalize">{formatMonth(month)}</h1>
      <button type="button" aria-label="Mes siguiente" className="px-3 py-1 text-xl" onClick={() => onChange(addMonths(month, 1))}>▶</button>
    </div>
  );
}
