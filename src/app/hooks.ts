import { liveQuery } from "dexie";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BudgetData } from "../domain/budget";
import { currentMonth, todayIso, type Month } from "../domain/month";
import type { Entity } from "../domain/schemas";
import { getMeta, type Meta } from "../data/db";
import type { Repos } from "../data/repos";
import type { Repository } from "../data/repository";
import { AppDataContext, type AppData } from "./context";
import { NotifyContext, type Notify } from "./notifyContext";

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData requiere RepoProvider");
  return value;
}

function useCollection<T extends Entity>(pick: (repos: Repos) => Repository<T>): T[] | undefined {
  const { repos } = useAppData();
  const repo = pick(repos);
  const [items, setItems] = useState<T[]>();
  useEffect(() => repo.subscribe(setItems), [repo]);
  return items;
}

export const useCards = () => useCollection((r) => r.cards);
export const usePurchases = () => useCollection((r) => r.purchases);
export const useIncomes = () => useCollection((r) => r.incomes);
export const useFixedExpenses = () => useCollection((r) => r.fixedExpenses);
export const useCategories = () => useCollection((r) => r.categories);

export function useBudgetData(): BudgetData | undefined {
  const purchases = usePurchases();
  const incomes = useIncomes();
  const fixedExpenses = useFixedExpenses();
  const categories = useCategories();
  return useMemo(
    () =>
      purchases && incomes && fixedExpenses && categories
        ? { purchases, incomes, fixedExpenses, categories }
        : undefined,
    [purchases, incomes, fixedExpenses, categories],
  );
}

export function useToday(): { today: string; month: Month } {
  const now = new Date();
  return { today: todayIso(now), month: currentMonth(now) };
}

export function useMeta(): Meta | undefined {
  const { db } = useAppData();
  const [meta, setMeta] = useState<Meta>();
  useEffect(() => {
    const sub = liveQuery(() => getMeta(db)).subscribe({ next: setMeta });
    return () => sub.unsubscribe();
  }, [db]);
  return meta;
}

export function useNotify(): Notify {
  const notify = useContext(NotifyContext);
  if (!notify) throw new Error("useNotify requiere NotifyProvider");
  return notify;
}

export const SAVE_FAILED = "No se pudo guardar. Probá de nuevo.";

/**
 * Envuelve una acción asíncrona: ignora reentradas mientras corre (doble toque),
 * expone `pending` para deshabilitar botones y avisa si falla en vez de rechazar en silencio.
 */
export function useAction<A extends unknown[]>(
  fn: (...args: A) => unknown,
  failMsg: string = SAVE_FAILED,
): { run: (...args: A) => Promise<void>; pending: boolean } {
  const notify = useNotify();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  async function run(...args: A) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      await fn(...args);
    } catch (err) {
      console.error(err);
      notify(failMsg);
    } finally {
      running.current = false;
      setPending(false);
    }
  }
  return { run, pending };
}
