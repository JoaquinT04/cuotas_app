import type { Currency } from "../../domain/money";
import { formatMoney } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { PreviewRow } from "../../domain/projection";
import { Panel } from "../../ui/Panel";

export function PurchasePreview({ rows, currency }: { rows: PreviewRow[]; currency: Currency }) {
  if (rows.length === 0) return null;
  const negatives = rows.filter((r) => r.after < 0).length;
  return (
    <Panel title="¿Me alcanza?">
      {negatives > 0 ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          Atención: {negatives} {negatives === 1 ? "mes queda" : "meses quedan"} en negativo.
        </p>
      ) : (
        <p className="text-sm text-green-700 dark:text-green-400">Todos los meses quedan en positivo.</p>
      )}
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left font-normal">Mes</th>
              <th className="text-right font-normal">Antes</th>
              <th className="text-right font-normal">Después</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="capitalize">{formatMonth(r.month)}</td>
                <td className="text-right">{formatMoney(r.before, currency)}</td>
                <td className={`text-right ${r.after < 0 ? "font-semibold text-red-600" : ""}`}>
                  {formatMoney(r.after, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
