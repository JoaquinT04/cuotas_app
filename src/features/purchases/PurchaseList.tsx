import { Link } from "react-router";
import {
  installmentNumberIn, isFinished, paidCount, remainingAmount,
} from "../../domain/installments";
import { formatMoney } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import type { Card, Purchase } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";

interface Props {
  purchases: Purchase[];
  cards: Card[];
  current: Month;
}

export function PurchaseList({ purchases, cards, current }: Props) {
  if (purchases.length === 0) {
    return <p className="text-sm text-slate-500">No hay compras para mostrar.</p>;
  }
  const groups = cards
    .map((card) => ({ card, items: purchases.filter((p) => p.cardId === card.id) }))
    .filter((g) => g.items.length > 0);
  return (
    <>
      {groups.map(({ card, items }) => (
        <Panel key={card.id} title={card.name}>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((p) => (
              <PurchaseItem key={p.id} purchase={p} color={card.color} current={current} />
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}

function PurchaseItem({ purchase: p, color, current }: { purchase: Purchase; color: string; current: Month }) {
  const n = installmentNumberIn(p, current);
  const status = isFinished(p, current)
    ? "Terminada"
    : n !== null
      ? `Cuota ${n}/${p.installmentsCount}`
      : `Empieza ${formatMonth(p.firstMonth)}`;
  const progress = (paidCount(p, current) / p.installmentsCount) * 100;
  return (
    <li>
      <Link to={`/compras/${p.id}`} className="block space-y-1 py-2">
        <div className="flex justify-between gap-2">
          <span>{p.description}</span>
          <span className="font-medium">{formatMoney(p.installmentAmount, p.currency)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{status}</span>
          <span>Resta {formatMoney(remainingAmount(p, current), p.currency)}</span>
        </div>
        <div className="h-1.5 rounded bg-slate-200 dark:bg-slate-700">
          <div className="h-1.5 rounded" style={{ width: `${progress}%`, background: color }} />
        </div>
      </Link>
    </li>
  );
}
