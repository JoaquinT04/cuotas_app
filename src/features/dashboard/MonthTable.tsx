import { Link } from "react-router";
import { formatMoney, type Currency } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { MonthProjection } from "../../domain/projection";

export function MonthTable({ projection, currency }: { projection: MonthProjection[]; currency: Currency }) {
  return (
    <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
      {projection.map((p) => {
        const b = p.breakdown[currency];
        const available = b?.available ?? 0;
        return (
          <li key={p.month}>
            <Link to={`/mes/${p.month}`} className="flex justify-between gap-2 py-2">
              <span className="w-20 capitalize">{formatMonth(p.month)}</span>
              <span className="flex-1 text-right text-slate-500">Cuotas {formatMoney(b?.installments ?? 0, currency)}</span>
              <span className={`w-32 text-right font-medium ${available < 0 ? "text-red-600" : ""}`}>
                {formatMoney(available, currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
