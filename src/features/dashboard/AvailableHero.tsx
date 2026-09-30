import { Link } from "react-router";
import { emptyBreakdown, type ByCurrency, type MonthBreakdown } from "../../domain/budget";
import { formatMoney, type Currency } from "../../domain/money";
import { Panel } from "../../ui/Panel";

interface Props {
  breakdown: ByCurrency<MonthBreakdown>;
  currencies: Currency[];
}

export function AvailableHero({ breakdown, currencies }: Props) {
  if (currencies.length === 0) {
    return (
      <Panel>
        <p className="text-sm">
          Todavía no hay datos para este mes. Cargá ingresos y gastos en{" "}
          <Link to="/presupuesto" className="text-indigo-600 underline">Presupuesto</Link>.
        </p>
      </Panel>
    );
  }
  return (
    <Panel title="Disponible para invertir">
      {currencies.map((c) => {
        const b = breakdown[c] ?? emptyBreakdown();
        return (
          <div key={c}>
            <p data-testid={`available-${c}`} className={`text-3xl font-bold ${b.available < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatMoney(b.available, c)}
            </p>
            <p className="text-xs text-slate-500">
              Ingresos {formatMoney(b.income, c)} · Fijos {formatMoney(b.fixed, c)} · Cuotas{" "}
              {formatMoney(b.installments, c)} · Variable {formatMoney(b.variable, c)}
            </p>
          </div>
        );
      })}
    </Panel>
  );
}
