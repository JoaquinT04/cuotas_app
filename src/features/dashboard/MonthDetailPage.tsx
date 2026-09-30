import { Link, useParams } from "react-router";
import { useBudgetData, useCards } from "../../app/hooks";
import { appliesIn, monthBreakdown } from "../../domain/budget";
import { installmentsInMonth } from "../../domain/installments";
import { CURRENCIES } from "../../domain/money";
import { formatMonth, isMonth } from "../../domain/month";
import { AmountList } from "../../ui/AmountList";
import { BreakdownTable } from "../../ui/BreakdownTable";
import { Panel } from "../../ui/Panel";

export function MonthDetailPage() {
  const { month = "" } = useParams();
  const data = useBudgetData();
  const cards = useCards();

  if (!isMonth(month)) return <p>Mes inválido.</p>;
  if (!data || !cards) return <p>Cargando…</p>;

  const cardName = new Map(cards.map((c) => [c.id, c.name]));
  const breakdown = monthBreakdown(data, month);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Volver" className="text-xl">←</Link>
        <h1 className="text-xl font-bold capitalize">{formatMonth(month)}</h1>
      </div>
      <Panel title="Cuotas">
        <AmountList
          items={installmentsInMonth(data.purchases, month).map((i) => ({
            id: i.purchaseId,
            label: i.description,
            detail: `· ${cardName.get(i.cardId) ?? "Tarjeta eliminada"} · ${i.number}/${i.total}`,
            amount: i.amount,
            currency: i.currency,
          }))}
        />
      </Panel>
      <Panel title="Ingresos">
        <AmountList
          items={data.incomes.filter((i) => appliesIn(i, month)).map((i) => ({ id: i.id, label: i.name, amount: i.amount, currency: i.currency }))}
        />
      </Panel>
      <Panel title="Gastos fijos">
        <AmountList
          items={data.fixedExpenses.filter((f) => appliesIn(f, month)).map((f) => ({ id: f.id, label: f.name, detail: `· ${f.category}`, amount: f.amount, currency: f.currency }))}
        />
      </Panel>
      <Panel title="Presupuesto variable">
        <AmountList
          items={data.categories.map((c) => ({ id: c.id, label: c.name, amount: c.monthlyAmount, currency: c.currency }))}
        />
      </Panel>
      <Panel title="Resultado">
        {CURRENCIES.filter((c) => breakdown[c]).map((c) => (
          <BreakdownTable key={c} breakdown={breakdown[c]!} currency={c} />
        ))}
      </Panel>
    </>
  );
}
