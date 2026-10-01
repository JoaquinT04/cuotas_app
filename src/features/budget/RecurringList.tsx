import { formatMoney, type Currency, type Money } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import { ConfirmButton } from "../../ui/ConfirmButton";

interface Item {
  id: string;
  name: string;
  amount: Money;
  currency: Currency;
  startMonth: Month;
  endMonth?: Month;
  category?: string;
}

interface Props<T extends Item> {
  items: T[];
  onEdit: (item: T) => void;
  onDelete: (id: string) => Promise<void>;
}

export function RecurringList<T extends Item>({ items, onEdit, onDelete }: Props<T>) {
  if (items.length === 0) return <p className="text-sm text-slate-500">Sin registros.</p>;
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2 py-2">
          <button type="button" className="flex-1 text-left" onClick={() => onEdit(i)}>
            <span className="block">
              {i.name}
              {i.category ? ` · ${i.category}` : ""}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {formatMonth(i.startMonth)} – {i.endMonth ? formatMonth(i.endMonth) : "sin fin"}
            </span>
          </button>
          <span className="font-medium">{formatMoney(i.amount, i.currency)}</span>
          <ConfirmButton label="Borrar" className="text-sm text-red-600" onConfirm={() => onDelete(i.id)} />
        </li>
      ))}
    </ul>
  );
}
