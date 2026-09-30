import { useId, useState, type FormEvent } from "react";
import type { z } from "zod";
import { CURRENCIES, formatMoneyInput, parseMoneyInput, type Currency, type Money } from "../../domain/money";
import type { Month } from "../../domain/month";
import { fixedExpenseInputSchema, incomeInputSchema } from "../../domain/schemas";
import { Field } from "../../ui/Field";
import { fieldErrors } from "../../ui/formErrors";
import { buttonClass, inputClass, secondaryButtonClass } from "../../ui/styles";

export interface RecurringValues {
  name: string;
  amount: Money;
  currency: Currency;
  startMonth: Month;
  endMonth?: Month;
  category?: string;
}

interface Props {
  withCategory?: boolean;
  initial?: RecurringValues;
  defaultStartMonth: Month;
  onSubmit: (value: RecurringValues) => Promise<void>;
  onCancel: () => void;
}

export function RecurringForm({ withCategory = false, initial, defaultStartMonth, onSubmit, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial ? formatMoneyInput(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "ARS");
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? defaultStartMonth);
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    const schema: z.ZodType<RecurringValues> = withCategory ? fixedExpenseInputSchema : incomeInputSchema;
    const result = schema.safeParse({
      name,
      amount: parsedAmount ?? Number.NaN,
      currency,
      startMonth,
      endMonth: endMonth || undefined,
      ...(withCategory ? { category } : {}),
    });
    if (!result.success) {
      const errs = fieldErrors(result.error);
      if (parsedAmount === null) errs.amount = "Monto inválido";
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
        <Field id={`${id}-amount`} label="Monto" error={errors.amount}>
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
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-start`} label="Mes de inicio" error={errors.startMonth}>
          <input id={`${id}-start`} type="month" className={inputClass} value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </Field>
        <Field id={`${id}-end`} label="Mes de fin" error={errors.endMonth} hint="Vacío = sin fin">
          <input id={`${id}-end`} type="month" className={inputClass} value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </Field>
      </div>
      {withCategory && (
        <Field id={`${id}-category`} label="Categoría" error={errors.category}>
          <input id={`${id}-category`} className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
      )}
      <div className="flex gap-2">
        <button type="submit" className={buttonClass}>Guardar</button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
