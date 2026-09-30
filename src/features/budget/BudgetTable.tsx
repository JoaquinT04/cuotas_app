import { emptyBreakdown, type BudgetData } from "../../domain/budget";
import { CURRENCIES, formatMoney } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import { project } from "../../domain/projection";
import { Panel } from "../../ui/Panel";

export function BudgetTable({ data, from }: { data: BudgetData; from: Month }) {
  const projection = project(data, from, 12);
  const currencies = CURRENCIES.filter((c) => projection.some((p) => p.breakdown[c]));
  if (currencies.length === 0) return null;
  return (
    <>
      {currencies.map((c) => (
        <Panel key={c} title={`Proyección · ${c}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left font-normal">Mes</th>
                  <th className="text-right font-normal">Ingresos</th>
                  <th className="text-right font-normal">Fijos</th>
                  <th className="text-right font-normal">Cuotas</th>
                  <th className="text-right font-normal">Variable</th>
                  <th className="text-right font-normal">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((p) => {
                  const b = p.breakdown[c] ?? emptyBreakdown();
                  return (
                    <tr key={p.month}>
                      <td className="capitalize">{formatMonth(p.month)}</td>
                      <td className="text-right">{formatMoney(b.income, c)}</td>
                      <td className="text-right">{formatMoney(b.fixed, c)}</td>
                      <td className="text-right">{formatMoney(b.installments, c)}</td>
                      <td className="text-right">{formatMoney(b.variable, c)}</td>
                      <td
                        data-testid={`budget-available-${c}-${p.month}`}
                        className={`text-right font-semibold ${b.available < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {formatMoney(b.available, c)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </>
  );
}
