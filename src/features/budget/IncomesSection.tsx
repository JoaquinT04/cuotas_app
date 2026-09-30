import { useState } from "react";
import { useAppData, useIncomes, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import type { Income } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";
import { smallButtonClass } from "../../ui/styles";
import { RecurringForm, type RecurringValues } from "./RecurringForm";
import { RecurringList } from "./RecurringList";

export function IncomesSection() {
  const { repos } = useAppData();
  const items = useIncomes();
  const { month } = useToday();
  const [editing, setEditing] = useState<Income | "new" | null>(null);

  async function save(v: RecurringValues) {
    const fields = { name: v.name, amount: v.amount, currency: v.currency, startMonth: v.startMonth, endMonth: v.endMonth };
    await repos.incomes.put(editing && editing !== "new" ? { ...editing, ...fields } : newEntity(fields));
    setEditing(null);
  }

  return (
    <Panel
      title="Ingresos"
      actions={editing === null && <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>Agregar</button>}
    >
      {editing !== null && (
        <RecurringForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          defaultStartMonth={month}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <RecurringList items={items ?? []} onEdit={setEditing} onDelete={(id) => void repos.incomes.remove(id)} />
    </Panel>
  );
}
