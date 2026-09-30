import { useState } from "react";
import { useBudgetData, useCards, useToday } from "../../app/hooks";
import { CURRENCIES } from "../../domain/money";
import { cardSummaries, project } from "../../domain/projection";
import { Panel } from "../../ui/Panel";
import { AvailableHero } from "./AvailableHero";
import { CardSummaryList } from "./CardSummaryList";
import { EmptyState } from "./EmptyState";
import { MonthNav } from "./MonthNav";
import { MonthTable } from "./MonthTable";
import { ProjectionChart } from "./ProjectionChart";

export function DashboardPage() {
  const data = useBudgetData();
  const cards = useCards();
  const { month: current } = useToday();
  const [month, setMonth] = useState(current);

  if (!data || !cards) return <p>Cargando…</p>;
  if (cards.length === 0) return <EmptyState />;

  const projection = project(data, month, 12);
  const currencies = CURRENCIES.filter((c) => projection.some((p) => p.breakdown[c]));
  const heroCurrencies = CURRENCIES.filter((c) => projection[0].breakdown[c]);

  return (
    <>
      <MonthNav month={month} onChange={setMonth} />
      <AvailableHero breakdown={projection[0].breakdown} currencies={heroCurrencies} />
      {currencies.map((c) => (
        <Panel key={c} title={`Próximos 12 meses · ${c}`}>
          <ProjectionChart projection={projection} cards={cards} currency={c} />
          <MonthTable projection={projection} currency={c} />
        </Panel>
      ))}
      <CardSummaryList summaries={cardSummaries(data.purchases, month)} cards={cards} />
    </>
  );
}
