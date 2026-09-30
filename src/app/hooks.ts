import { liveQuery } from "dexie";
import { useContext, useEffect, useMemo, useState } from "react";
import type { BudgetData } from "../domain/budget";
import { currentMonth, todayIso, type Month } from "../domain/month";
import type { Entity } from "../domain/schemas";
import { getMeta, type Meta } from "../data/db";
import type { Repos } from "../data/repos";
import type { Repository } from "../data/repository";
import { AppDataContext, type AppData } from "./context";

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
