import type { BudgetCategory, Card, FixedExpense, Income, Purchase } from "../domain/schemas";
import type { CuotasDB } from "./db";
import { createDexieRepository } from "./dexieRepository";
import type { Repository } from "./repository";

export interface Repos {
  cards: Repository<Card>;
  purchases: Repository<Purchase>;
  incomes: Repository<Income>;
  fixedExpenses: Repository<FixedExpense>;
  categories: Repository<BudgetCategory>;
}

export function createRepos(db: CuotasDB): Repos {
  return {
    cards: createDexieRepository(db.cards),
    purchases: createDexieRepository(db.purchases),
    incomes: createDexieRepository(db.incomes),
    fixedExpenses: createDexieRepository(db.fixedExpenses),
    categories: createDexieRepository(db.categories),
  };
}
