import { useId, useState, type FormEvent } from "react";
import { useAppData, useCategories } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import { CURRENCIES, formatMoney, formatMoneyInput, parseMoneyInput, type Currency } from "../../domain/money";
import { budgetCategoryInputSchema, type BudgetCategory, type BudgetCategoryInput } from "../../domain/schemas";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { Field } from "../../ui/Field";
import { fieldErrors } from "../../ui/formErrors";
import { Panel } from "../../ui/Panel";
import { buttonClass, inputClass, secondaryButtonClass, smallButtonClass } from "../../ui/styles";

function CategoryForm({ initial, onSubmit, onCancel }: {
  initial?: BudgetCategory;
  onSubmit: (v: BudgetCategoryInput) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? formatMoneyInput(initial.monthlyAmount) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "ARS");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    const result = budgetCategoryInputSchema.safeParse({ name, monthlyAmount: parsedAmount ?? Number.NaN, currency });
    if (!result.success) {
      const errs = fieldErrors(result.error);
      if (parsedAmount === null) errs.monthlyAmount = "Monto inválido";
      setErrors(errs);
      return;
    }
    await onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Field id={`${id}-name`} label="Nombre" error={errors.name}>
        <input id={`${id}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-amount`} label="Monto mensual" error={errors.monthlyAmount}>
          <input id={`${id}-amount`} inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field id={`${id}-currency`} label="Moneda">
          <select id={`${id}-currency`} className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass}>Guardar</button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export function CategoriesSection() {
  const { repos } = useAppData();
  const items = useCategories();
  const [editing, setEditing] = useState<BudgetCategory | "new" | null>(null);

  async function save(v: BudgetCategoryInput) {
    await repos.categories.put(editing && editing !== "new" ? { ...editing, ...v } : newEntity(v));
    setEditing(null);
  }

  return (
    <Panel
      title="Presupuesto variable"
      actions={editing === null && <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>Agregar</button>}
    >
      {editing !== null && (
        <CategoryForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      {!items || items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin categorías. Ej: comida, transporte, salidas.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <button type="button" className="flex-1 text-left" onClick={() => setEditing(c)}>{c.name}</button>
              <span className="font-medium">{formatMoney(c.monthlyAmount, c.currency)}</span>
              <ConfirmButton label="Borrar" className="text-sm text-red-600" onConfirm={() => repos.categories.remove(c.id)} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
