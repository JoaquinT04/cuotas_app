import type { MonthBreakdown } from "../domain/budget";
import { formatMoney, type Currency } from "../domain/money";

export function BreakdownTable({ breakdown: b, currency }: { breakdown: MonthBreakdown; currency: Currency }) {
  const rows: [string, number][] = [
    ["Ingresos", b.income],
    ["Gastos fijos", -b.fixed],
    ["Cuotas", -b.installments],
    ["Presupuesto variable", -b.variable],
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className="text-right">{formatMoney(value, currency)}</td>
          </tr>
        ))}
        <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
          <td>Disponible ({currency})</td>
          <td className={`text-right ${b.available < 0 ? "text-red-600" : "text-green-600"}`}>
            {formatMoney(b.available, currency)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
