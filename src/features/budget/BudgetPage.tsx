import { useBudgetData, useToday } from "../../app/hooks";
import { BudgetTable } from "./BudgetTable";
import { CategoriesSection } from "./CategoriesSection";
import { FixedExpensesSection } from "./FixedExpensesSection";
import { IncomesSection } from "./IncomesSection";

export function BudgetPage() {
  const data = useBudgetData();
  const { month } = useToday();
  return (
    <>
      <h1 className="text-xl font-bold">Presupuesto</h1>
      <IncomesSection />
      <FixedExpensesSection />
      <CategoriesSection />
      {data && <BudgetTable data={data} from={month} />}
    </>
  );
}
