import { useState } from "react";
import { useAppData, useFixedExpenses, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import type { FixedExpense } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";
import { smallButtonClass } from "../../ui/styles";
import { RecurringForm, type RecurringValues } from "./RecurringForm";
import { RecurringList } from "./RecurringList";

export function FixedExpensesSection() {
  const { repos } = useAppData();
  const items = useFixedExpenses();
  const { month } = useToday();
  const [editing, setEditing] = useState<FixedExpense | "new" | null>(null);

  async function save(v: RecurringValues) {
    const fields = {
      name: v.name,
      amount: v.amount,
      currency: v.currency,
      startMonth: v.startMonth,
      endMonth: v.endMonth,
      category: v.category ?? "General",
    };
    await repos.fixedExpenses.put(editing && editing !== "new" ? { ...editing, ...fields } : newEntity(fields));
    setEditing(null);
  }

  return (
    <Panel
      title="Gastos fijos"
      actions={editing === null && <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>Agregar</button>}
    >
      {editing !== null && (
        <RecurringForm
          key={editing === "new" ? "new" : editing.id}
          withCategory
          initial={editing === "new" ? undefined : editing}
          defaultStartMonth={month}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <RecurringList items={items ?? []} onEdit={setEditing} onDelete={(id) => repos.fixedExpenses.remove(id)} />
    </Panel>
  );
}
