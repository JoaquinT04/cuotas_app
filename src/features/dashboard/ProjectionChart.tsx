import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney, type Currency } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { MonthProjection } from "../../domain/projection";
import type { Card } from "../../domain/schemas";

const compact = new Intl.NumberFormat("es-AR", { notation: "compact" });

interface Props {
  projection: MonthProjection[];
  cards: Card[];
  currency: Currency;
}

export function ProjectionChart({ projection, cards, currency }: Props) {
  const rows = projection.map((p) => {
    const row: Record<string, number | string> = {
      label: formatMonth(p.month),
      available: (p.breakdown[currency]?.available ?? 0) / 100,
    };
    for (const c of cards) row[c.id] = (p.byCard[currency]?.[c.id] ?? 0) / 100;
    return row;
  });
  const withData = cards.filter((c) => projection.some((p) => p.byCard[currency]?.[c.id]));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={(v) => compact.format(Number(v))} />
          <Tooltip formatter={(v) => formatMoney(Math.round(Number(v) * 100), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {withData.map((c) => (
            <Bar key={c.id} dataKey={c.id} name={c.name} stackId="cuotas" fill={c.color} />
          ))}
          <Line dataKey="available" name="Disponible" stroke="#16a34a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
