import { useState } from "react";
import { useAppData, useCards, usePurchases, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import { isFinished } from "../../domain/installments";
import type { Card, CardInput } from "../../domain/schemas";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { Panel } from "../../ui/Panel";
import { dangerButtonClass, secondaryButtonClass, smallButtonClass } from "../../ui/styles";
import { CardForm } from "./CardForm";

const COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#a855f7"];

export function CardsSection() {
  const { repos } = useAppData();
  const cards = useCards();
  const purchases = usePurchases();
  const { month } = useToday();
  const [editing, setEditing] = useState<Card | "new" | null>(null);
  const [blocked, setBlocked] = useState<Card | null>(null);

  if (!cards || !purchases) return null;

  const purchasesOf = (cardId: string) => purchases.filter((p) => p.cardId === cardId);

  async function save(value: CardInput) {
    await repos.cards.put(editing && editing !== "new" ? { ...editing, ...value } : newEntity(value));
    setEditing(null);
  }

  async function deleteWithPurchases(card: Card) {
    for (const p of purchasesOf(card.id)) await repos.purchases.remove(p.id);
    await repos.cards.remove(card.id);
    setBlocked(null);
  }

  async function archive(card: Card) {
    await repos.cards.put({ ...card, archived: true });
    setBlocked(null);
  }

  async function requestDelete(card: Card) {
    if (purchasesOf(card.id).some((p) => !isFinished(p, month))) setBlocked(card);
    else await deleteWithPurchases(card);
  }

  return (
    <Panel
      title="Tarjetas"
      actions={
        editing === null && (
          <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>
            Agregar tarjeta
          </button>
        )
      }
    >
      {editing !== null && (
        <CardForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          defaultColor={COLORS[cards.length % COLORS.length]}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      {blocked && (
        <div role="alert" className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">
          <p>{blocked.name} tiene cuotas pendientes. Podés archivarla (sus cuotas siguen contando) o borrarla junto con sus compras.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => void archive(blocked)}>
              Archivar tarjeta
            </button>
            <ConfirmButton label="Borrar tarjeta y sus compras" className={dangerButtonClass} onConfirm={() => deleteWithPurchases(blocked)} />
          </div>
        </div>
      )}
      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no cargaste tarjetas.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
              <div className="flex-1">
                <p>
                  {c.name} {c.archived && <span className="text-xs text-slate-500">archivada</span>}
                </p>
                <p className="text-xs text-slate-500">
                  {c.closingDay ? `cierra día ${c.closingDay}` : "sin día de cierre"}
                  {c.dueDay ? ` · vence día ${c.dueDay}` : ""}
                </p>
              </div>
              <button type="button" className={smallButtonClass} onClick={() => setEditing(c)}>
                Editar
              </button>
              <ConfirmButton label="Borrar" className="text-sm text-red-600" onConfirm={() => requestDelete(c)} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
