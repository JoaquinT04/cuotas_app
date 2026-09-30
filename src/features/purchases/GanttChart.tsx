import { Fragment } from "react";
import { lastMonth } from "../../domain/installments";
import { formatMonth, monthDiff, monthRange, type Month } from "../../domain/month";
import type { Card, Purchase } from "../../domain/schemas";

const MAX_COLUMNS = 24;

interface Props {
  purchases: Purchase[];
  cards: Card[];
  from: Month;
}

export function GanttChart({ purchases, cards, from }: Props) {
  if (purchases.length === 0) {
    return <p className="text-sm text-slate-500">No hay compras activas.</p>;
  }
  const colorOf = new Map(cards.map((c) => [c.id, c.color]));
  const end = purchases.map(lastMonth).reduce((a, b) => (a > b ? a : b));
  const columns = Math.max(1, Math.min(MAX_COLUMNS, monthDiff(from, end) + 1));
  const months = monthRange(from, columns);
  const lastVisible = months[months.length - 1];
  const beyond = purchases.filter((p) => p.firstMonth > lastVisible).length;
  const rows = purchases.filter((p) => p.firstMonth <= lastVisible).sort(
    (a, b) => a.firstMonth.localeCompare(b.firstMonth) || lastMonth(a).localeCompare(lastMonth(b)),
  );

  return (
    <div
      data-testid="gantt"
      role="region"
      aria-label="Línea de tiempo de compras"
      tabIndex={0}
      className="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900"
    >
      <div
        className="grid gap-y-1 text-xs"
        style={{ gridTemplateColumns: `8rem repeat(${columns}, 2.75rem)` }}
      >
        <div style={{ gridRow: 1, gridColumn: 1 }} />
        {months.map((m, i) => (
          <div key={m} className="text-center text-slate-500 capitalize" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {formatMonth(m)}
          </div>
        ))}
        {rows.map((p, i) => {
          const start = p.firstMonth > from ? p.firstMonth : from;
          const last = lastMonth(p);
          const stop = last < lastVisible ? last : lastVisible;
          const colStart = monthDiff(from, start) + 2;
          const colEnd = monthDiff(from, stop) + 3;
          return (
            <Fragment key={p.id}>
              <div className="sticky left-0 z-10 truncate bg-white pr-2 dark:bg-slate-900" style={{ gridRow: i + 2, gridColumn: 1 }}>
                {p.description}
              </div>
              <div
                data-testid={`gantt-bar-${p.id}`}
                data-start={colStart}
                data-end={colEnd}
                title={`${p.description}: ${formatMonth(p.firstMonth)} – ${formatMonth(last)}`}
                className="h-5 rounded"
                style={{
                  gridRow: i + 2,
                  gridColumn: `${colStart} / ${colEnd}`,
                  background: colorOf.get(p.cardId) ?? "#94a3b8",
                }}
              />
            </Fragment>
          );
        })}
      </div>
      {beyond > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {beyond === 1 ? "1 compra empieza" : `${beyond} compras empiezan`} después de {formatMonth(lastVisible)}.
        </p>
      )}
    </div>
  );
}
