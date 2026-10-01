import { useId, useState, type FormEvent } from "react";
import { useAction } from "../../app/hooks";
import { cardInputSchema, type Card, type CardInput } from "../../domain/schemas";
import { Field } from "../../ui/Field";
import { fieldErrors } from "../../ui/formErrors";
import { buttonClass, inputClass, secondaryButtonClass } from "../../ui/styles";

interface Props {
  initial?: Card;
  defaultColor: string;
  onSubmit: (value: CardInput) => Promise<void>;
  onCancel: () => void;
}

const toOptionalInt = (s: string) => (s.trim() === "" ? undefined : Number(s));

export function CardForm({ initial, defaultColor, onSubmit, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? defaultColor);
  const [closingDay, setClosingDay] = useState(initial?.closingDay?.toString() ?? "");
  const [dueDay, setDueDay] = useState(initial?.dueDay?.toString() ?? "");
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = useAction(onSubmit);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = cardInputSchema.safeParse({
      name,
      color,
      closingDay: toOptionalInt(closingDay),
      dueDay: toOptionalInt(dueDay),
      archived,
    });
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    void submit.run(result.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Field id={`${id}-name`} label="Nombre" error={errors.name}>
        <input id={`${id}-name`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id={`${id}-color`} label="Color">
        <input id={`${id}-color`} type="color" className="h-10 w-16" value={color} onChange={(e) => setColor(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-closing`} label="Día de cierre" error={errors.closingDay} hint="Opcional. Sugiere el mes de la 1ra cuota.">
          <input id={`${id}-closing`} type="number" inputMode="numeric" className={inputClass} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
        </Field>
        <Field id={`${id}-due`} label="Día de vencimiento" error={errors.dueDay} hint="Opcional.">
          <input id={`${id}-due`} type="number" inputMode="numeric" className={inputClass} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
      </div>
      {initial && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          Archivada (no aparece al cargar compras)
        </label>
      )}
      <div className="flex gap-2">
        <button type="submit" className={buttonClass} disabled={submit.pending}>Guardar</button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
