import { formatMoney, type Currency, type Money } from "../domain/money";

export interface AmountItem {
  id: string;
  label: string;
  detail?: string;
  amount: Money;
  currency: Currency;
}

export function AmountList({ items }: { items: AmountItem[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">Nada este mes.</p>;
  return (
    <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
      {items.map((i) => (
        <li key={i.id} className="flex justify-between gap-2 py-1">
          <span>
            <span>{i.label}</span>
            {i.detail && <span className="text-slate-500"> {i.detail}</span>}
          </span>
          <span>{formatMoney(i.amount, i.currency)}</span>
        </li>
      ))}
    </ul>
  );
}
