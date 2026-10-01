import { useId, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAppData, useBudgetData, useCards, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import { defaultFirstMonth, suggestFirstMonth } from "../../domain/closing";
import {
  CURRENCIES, divideEvenly, formatMoney, formatMoneyInput, parseMoneyInput, type Currency,
} from "../../domain/money";
import { previewPurchase } from "../../domain/projection";
import { purchaseInputSchema, type Purchase } from "../../domain/schemas";
import { Field } from "../../ui/Field";
import { fieldErrors } from "../../ui/formErrors";
import { buttonClass, inputClass } from "../../ui/styles";
import { PurchasePreview } from "./PurchasePreview";

type AmountMode = "installment" | "total";

interface Props {
  initial?: Purchase;
  onSaved: () => void;
}

export function PurchaseForm({ initial, onSaved }: Props) {
  const id = useId();
  const { repos } = useAppData();
  const cards = useCards();
  const data = useBudgetData();
  const { today, month: currentMonth } = useToday();

  const [cardId, setCardId] = useState(initial?.cardId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "ARS");
  const [count, setCount] = useState(String(initial?.installmentsCount ?? 1));
  const [mode, setMode] = useState<AmountMode>("installment");
  const [amount, setAmount] = useState(initial ? formatMoneyInput(initial.installmentAmount) : "");
  const [purchaseDate, setPurchaseDate] = useState(initial ? (initial.purchaseDate ?? "") : today);
  const [firstMonth, setFirstMonth] = useState(initial?.firstMonth ?? "");
  const [firstMonthTouched, setFirstMonthTouched] = useState(initial !== undefined);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!cards || !data) return <p>Cargando…</p>;

  const selectable = cards.filter((c) => !c.archived || c.id === initial?.cardId);
  if (selectable.length === 0) {
    return (
      <p className="text-sm">
        Primero agregá una tarjeta en{" "}
        <Link to="/ajustes" className="text-indigo-600 underline">Ajustes</Link>.
      </p>
    );
  }

  const effectiveCardId = cardId || (selectable.length === 1 ? selectable[0].id : "");
  const card = cards.find((c) => c.id === effectiveCardId);
  const suggested = card && purchaseDate ? suggestFirstMonth(purchaseDate, card) : null;
  const effectiveFirstMonth = firstMonthTouched
    ? firstMonth
    : (suggested ?? (purchaseDate ? defaultFirstMonth(purchaseDate) : firstMonth));

  const parsedAmount = parseMoneyInput(amount);
  const countNum = Number(count);
  const validCount = Number.isInteger(countNum) && countNum > 0;
  const installmentAmount =
    parsedAmount === null
      ? null
      : mode === "total" && validCount
        ? divideEvenly(parsedAmount, countNum)
        : parsedAmount;

  const parsed = purchaseInputSchema.safeParse({
    cardId: effectiveCardId,
    description,
    currency,
    installmentAmount: installmentAmount ?? Number.NaN,
    installmentsCount: countNum,
    firstMonth: effectiveFirstMonth,
    purchaseDate: purchaseDate || undefined,
    category: category.trim() || undefined,
  });

  const draft: Purchase | null = parsed.success
    ? { ...parsed.data, id: initial?.id ?? "draft", createdAt: initial?.createdAt ?? "", updatedAt: "" }
    : null;
  const preview = draft ? previewPurchase(data, draft, currentMonth) : [];

  const amountHint =
    installmentAmount !== null && validCount
      ? mode === "total"
        ? `${countNum} cuotas de ${formatMoney(installmentAmount, currency)}`
        : `Total ${formatMoney(installmentAmount * countNum, currency)}`
      : undefined;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      if (installmentAmount === null) errs.installmentAmount = "Monto inválido";
      setErrors(errs);
      return;
    }
    await repos.purchases.put(initial ? { ...initial, ...parsed.data } : newEntity(parsed.data));
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field id={`${id}-card`} label="Tarjeta" error={errors.cardId}>
        <select id={`${id}-card`} className={inputClass} value={effectiveCardId} onChange={(e) => setCardId(e.target.value)}>
          <option value="">Elegí una tarjeta</option>
          {selectable.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field id={`${id}-desc`} label="Descripción" error={errors.description}>
        <input id={`${id}-desc`} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-currency`} label="Moneda">
          <select id={`${id}-currency`} className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field id={`${id}-count`} label="Cantidad de cuotas" error={errors.installmentsCount}>
          <input id={`${id}-count`} type="number" inputMode="numeric" min={1} max={72} className={inputClass} value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-mode`} label="Cargar como">
          <select id={`${id}-mode`} className={inputClass} value={mode} onChange={(e) => setMode(e.target.value as AmountMode)}>
            <option value="installment">Valor de la cuota</option>
            <option value="total">Monto total</option>
          </select>
        </Field>
        <Field
          id={`${id}-amount`}
          label={mode === "total" ? "Monto total" : "Valor de la cuota"}
          error={errors.installmentAmount}
          hint={amountHint}
        >
          <input id={`${id}-amount`} inputMode="decimal" placeholder="0,00" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-date`} label="Fecha de compra" error={errors.purchaseDate}>
          <input id={`${id}-date`} type="date" className={inputClass} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field
          id={`${id}-first`}
          label="Mes de la 1ra cuota"
          error={errors.firstMonth}
          hint={!firstMonthTouched && suggested ? "Sugerido según el cierre de la tarjeta" : undefined}
        >
          <input
            id={`${id}-first`}
            type="month"
            className={inputClass}
            value={effectiveFirstMonth}
            onChange={(e) => {
              setFirstMonth(e.target.value);
              setFirstMonthTouched(true);
            }}
          />
        </Field>
      </div>

      <Field id={`${id}-category`} label="Categoría" error={errors.category} hint="Opcional">
        <input id={`${id}-category`} className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
      </Field>

      <PurchasePreview rows={preview} currency={currency} />

      <button type="submit" className={`${buttonClass} w-full`}>Guardar compra</button>
    </form>
  );
}
