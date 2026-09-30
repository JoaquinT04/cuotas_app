import { formatMoney } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { CardSummary } from "../../domain/projection";
import type { Card } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";

export function CardSummaryList({ summaries, cards }: { summaries: CardSummary[]; cards: Card[] }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return (
    <Panel title="Tarjetas">
      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">No hay cuotas pendientes.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {summaries.map((s) => {
            const card = byId.get(s.cardId);
            return (
              <li key={`${s.cardId}-${s.currency}`} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: card?.color }} />
                    {card?.name ?? "Tarjeta eliminada"}
                  </span>
                  <span className="font-semibold">{formatMoney(s.thisMonth, s.currency)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {s.activeCount} {s.activeCount === 1 ? "compra" : "compras"} · última cuota{" "}
                  {formatMonth(s.lastMonth)} · restan {formatMoney(s.remaining, s.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
