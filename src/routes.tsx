import { Route, Routes } from "react-router";
import { Layout } from "./app/Layout";
import { BudgetPage } from "./features/budget/BudgetPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { MonthDetailPage } from "./features/dashboard/MonthDetailPage";
import { PurchaseFormPage } from "./features/purchases/PurchaseFormPage";
import { PurchasesPage } from "./features/purchases/PurchasesPage";
import { SettingsPage } from "./features/settings/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="mes/:month" element={<MonthDetailPage />} />
        <Route path="compras" element={<PurchasesPage />} />
        <Route path="compras/nueva" element={<PurchaseFormPage />} />
        <Route path="compras/:id" element={<PurchaseFormPage />} />
        <Route path="presupuesto" element={<BudgetPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
