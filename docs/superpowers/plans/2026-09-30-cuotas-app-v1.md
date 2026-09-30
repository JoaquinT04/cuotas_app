# Cuotas App v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA mobile-first para ver cuotas de tarjetas de crédito, presupuesto mensual y disponible para invertir, con datos locales y arquitectura lista para migrar a la nube.

**Architecture:** Tres capas. `src/domain` contiene la lógica pura y testeada (dinero, meses, cuotas, cierre, presupuesto y proyección), sin dependencias de React ni de almacenamiento. `src/data` implementa el contrato `Repository<T>` sobre Dexie/IndexedDB, más backup JSON versionado. `src/features` y `src/ui` son la interfaz en React y acceden a los datos solo mediante hooks que consumen `Repository`.

**Tech Stack:** React 19 + TypeScript strict + Vite + Tailwind v4 + react-router (HashRouter) + Dexie 4 + zod 4 + Recharts + vite-plugin-pwa. Tests con Vitest, Testing Library, fake-indexeddb y Playwright.

**Spec:** `docs/superpowers/specs/2026-09-30-cuotas-app-design.md`

## Global Constraints

- La interfaz está en español (Argentina). Los identificadores del código van en inglés.
- Los montos son `Money` = entero en centavos. Nunca se persiste un `float`.
- El mes es un string `"YYYY-MM"` (tipo `Month`).
- `Currency` = `"ARS" | "USD"`. Nunca se suman montos de monedas distintas.
- `src/domain/` no importa React, Dexie ni APIs del navegador (se permite `Intl`).
- `src/features/` accede a los datos solo mediante los hooks de `src/app/hooks.ts`. Excepción: backup y meta usan `db` desde `useAppData()`.
- Límites: cuotas de 1 a 72; días de cierre y vencimiento de 1 a 31; `name` hasta 40 caracteres; `description` hasta 80.
- Todas las entidades tienen `id`, `createdAt`, `updatedAt` y `deletedAt?`. El borrado siempre es lógico.
- Rutas con `HashRouter`, porque GitHub Pages no soporta rewrites.
- Node 22. `npm run lint`, `npm run typecheck` y `npm test` tienen que pasar al cerrar cada tarea.
- Todo commit termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Montos en formato argentino** (`"1.234,56"`, `"$ 10.000"`, `"10.5"`): se parsean bien. Si la entrada es basura, se muestra "Monto inválido" y nunca se guarda `NaN`. Tests en Task 2 y Task 13.
2. **Cambio de año**: una compra en diciembre después del cierre, o cuotas que cruzan de año, caen en los meses correctos. Tests en Task 5 y Task 6.
3. **Editar una compra**: la vista previa "¿me alcanza?" no cuenta dos veces la compra original. Test en Task 8.
4. **Registros borrados** (borrado lógico, tarjeta borrada junto con sus compras): nunca aparecen ni suman. Tests en Task 9 y Task 12.
5. **Importar un JSON ajeno, roto o de una versión más nueva**: muestra un error claro y no modifica los datos. Tests en Task 10 y Task 17.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, eslint.config.js, .prettierrc, .gitignore, index.html
playwright.config.ts, e2e/smoke.spec.ts, .github/workflows/ci.yml, README.md
public/icon.svg (+ PNG generados)
src/
  main.tsx               bootstrap: db, providers, persistencia, UpdatePrompt
  index.css              Tailwind
  vite-env.d.ts          tipos Vite + __APP_VERSION__
  App.tsx                HashRouter + AppRoutes
  routes.tsx             AppRoutes (rutas)
  domain/
    money.ts             Money, Currency, parse/format
    month.ts             Month y utilidades
    schemas.ts           esquemas zod + tipos de entidades
    installments.ts      cuotas derivadas de compras
    closing.ts           sugerencia de mes de 1ra cuota
    budget.ts            desglose mensual por moneda
    projection.ts        proyección, resumen por tarjeta, vista previa
  data/
    db.ts                Dexie, Meta, SCHEMA_VERSION
    repository.ts        interfaz Repository<T>, newEntity
    dexieRepository.ts   implementación Dexie
    repos.ts             Repos + createRepos
    backup.ts            export/import/parse/recordatorio
    storage.ts           persistencia y disponibilidad
  app/
    context.ts           AppDataContext
    RepoProvider.tsx     provider
    hooks.ts             useAppData, useCards, useBudgetData, useToday, useMeta...
    Layout.tsx           layout + nav inferior + FAB
    StorageBanner.tsx
    BackupReminder.tsx
    ErrorBoundary.tsx
    UpdatePrompt.tsx
  ui/
    styles.ts, Field.tsx, Panel.tsx, ConfirmButton.tsx, formErrors.ts, download.ts,
    BreakdownTable.tsx, AmountList.tsx
  features/
    dashboard/  DashboardPage, MonthNav, AvailableHero, ProjectionChart, MonthTable,
                CardSummaryList, EmptyState, MonthDetailPage
    purchases/  PurchasesPage, PurchaseList, GanttChart, PurchaseForm, PurchasePreview,
                PurchaseFormPage
    budget/     BudgetPage, RecurringForm, RecurringList, IncomesSection,
                FixedExpensesSection, CategoriesSection, BudgetTable
    settings/   SettingsPage, CardForm, CardsSection, BackupSection
  test/
    setup.ts, factories.ts, render.tsx
```

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/test/setup.ts`
- Test: `src/test/setup.test.ts`

**Interfaces:**
- Produces: scripts `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `typecheck`, `format`. Setup de tests con `fake-indexeddb`, jest-dom, `ResizeObserver` mock y cleanup automático.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "cuotas-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 2: Instalar dependencias**

```bash
npm install react react-dom react-router dexie zod@^4 recharts
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event fake-indexeddb eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh globals prettier
```

- [ ] **Step 3: Crear archivos de configuración**

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

`eslint.config.js`:
```js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "coverage", "playwright-report", "test-results"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);
```

`.prettierrc`:
```json
{ "printWidth": 100 }
```

`.gitignore`:
```
node_modules
dist
dev-dist
coverage
playwright-report
test-results
```

`index.html`:
```html
<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#4f46e5" />
    <title>Cuotas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
```

`src/main.tsx` (bootstrap mínimo; se reemplaza en la Task 11):
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <h1>Cuotas</h1>
  </StrictMode>,
);
```

`src/test/setup.ts`:
```ts
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverMock as unknown as typeof ResizeObserver;

afterEach(() => cleanup());
```

- [ ] **Step 4: Escribir el test de sanidad**

`src/test/setup.test.ts`:
```ts
import { describe, expect, it } from "vitest";

describe("setup de tests", () => {
  it("tiene IndexedDB simulado y randomUUID", () => {
    expect(globalThis.indexedDB).toBeDefined();
    expect(typeof crypto.randomUUID()).toBe("string");
  });
});
```

- [ ] **Step 5: Verificar todo**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: 1 test PASS, lint sin errores, build genera `dist/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react ts project with tailwind and vitest" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `domain/money.ts`

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/money.test.ts`

**Interfaces:**
- Produces:
  - `CURRENCIES: readonly ["ARS","USD"]`, `type Currency`, `type Money = number`
  - `toCents(value: number): Money`
  - `parseMoneyInput(input: string): Money | null`
  - `formatMoney(amount: Money, currency: Currency): string`
  - `formatMoneyInput(amount: Money): string` (ej. `123456 → "1234,56"`)
  - `divideEvenly(total: Money, parts: number): Money`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { divideEvenly, formatMoney, formatMoneyInput, parseMoneyInput, toCents } from "./money";

describe("toCents", () => {
  it("redondea a centavos", () => {
    expect(toCents(10.1)).toBe(1010);
    expect(toCents(0.29)).toBe(29);
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["$ 10.000", 1000000],
    ["10000", 1000000],
    ["10.5", 1050],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["  250  ", 25000],
  ])("parsea %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1,2,3", "12,345", "1.2.3,4,5"])("rechaza %s", (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formatea ARS en es-AR", () => {
    expect(formatMoney(123456, "ARS")).toMatch(/1\.234,56/);
  });
  it("formatea USD con prefijo US$", () => {
    expect(formatMoney(1050, "USD")).toMatch(/US\$/);
    expect(formatMoney(1050, "USD")).toMatch(/10,50/);
  });
  it("formatea negativos", () => {
    expect(formatMoney(-5000, "ARS")).toMatch(/-.*50,00/);
  });
});

describe("formatMoneyInput", () => {
  it("devuelve número editable con coma decimal", () => {
    expect(formatMoneyInput(123456)).toBe("1234,56");
    expect(formatMoneyInput(1000000)).toBe("10000,00");
  });
  it("vuelve a parsearse al mismo valor", () => {
    expect(parseMoneyInput(formatMoneyInput(987654))).toBe(987654);
  });
});

describe("divideEvenly", () => {
  it("divide y redondea", () => {
    expect(divideEvenly(12000000, 12)).toBe(1000000);
    expect(divideEvenly(10000, 3)).toBe(3333);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/money.test.ts`
Expected: FAIL, no se puede resolver `./money`.

- [ ] **Step 3: Implementar**

```ts
export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Monto en centavos. Siempre entero. */
export type Money = number;

export function toCents(value: number): Money {
  return Math.round(value * 100);
}

/**
 * Acepta formato es-AR ("1.234,56") y punto decimal ("10.5").
 * Sin coma: un punto seguido de exactamente 3 dígitos (o varios puntos) es separador de miles.
 */
export function parseMoneyInput(input: string): Money | null {
  let s = input.replace(/[\s$]/g, "").replace(/^(ARS|USD|US)/i, "");
  if (s === "") return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "");
    if ((s.match(/,/g) ?? []).length > 1) return null;
    s = s.replace(",", ".");
  } else {
    const parts = s.split(".");
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = parts.join("");
    }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return toCents(Number(s));
}

const formatters = new Map<Currency, Intl.NumberFormat>();

export function formatMoney(amount: Money, currency: Currency): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount / 100);
}

export function formatMoneyInput(amount: Money): string {
  return (amount / 100).toFixed(2).replace(".", ",");
}

export function divideEvenly(total: Money, parts: number): Money {
  return Math.round(total / parts);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/money.ts src/domain/money.test.ts
git commit -m "feat(domain): add money parsing and formatting" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `domain/month.ts`

**Files:**
- Create: `src/domain/month.ts`
- Test: `src/domain/month.test.ts`

**Interfaces:**
- Produces:
  - `type Month = string`, `MONTH_RE: RegExp`, `isMonth(v: string): boolean`
  - `toMonth(year: number, month: number): Month`, `parseMonth(m: Month): { year: number; month: number }`
  - `addMonths(m: Month, n: number): Month`, `monthDiff(from: Month, to: Month): number`
  - `monthRange(from: Month, count: number): Month[]`
  - `currentMonth(now?: Date): Month`, `todayIso(now?: Date): string` (`YYYY-MM-DD` local), `monthOfDate(isoDate: string): Month`
  - `daysInMonth(year: number, month: number): number`, `formatMonth(m: Month): string`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import {
  addMonths, currentMonth, daysInMonth, formatMonth, isMonth, monthDiff, monthOfDate,
  monthRange, parseMonth, toMonth, todayIso,
} from "./month";

describe("month", () => {
  it("valida formato", () => {
    expect(isMonth("2026-01")).toBe(true);
    expect(isMonth("2026-12")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(isMonth("abc")).toBe(false);
  });

  it("construye y parsea", () => {
    expect(toMonth(2026, 3)).toBe("2026-03");
    expect(parseMonth("2026-11")).toEqual({ year: 2026, month: 11 });
  });

  it("suma meses cruzando años", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 71)).toBe("2032-09");
    expect(addMonths("2026-05", 0)).toBe("2026-05");
  });

  it("calcula diferencia", () => {
    expect(monthDiff("2026-11", "2027-02")).toBe(3);
    expect(monthDiff("2027-02", "2026-11")).toBe(-3);
  });

  it("genera rangos", () => {
    expect(monthRange("2026-11", 3)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthRange("2026-11", 0)).toEqual([]);
  });

  it("usa fecha local", () => {
    expect(currentMonth(new Date(2026, 8, 30))).toBe("2026-09");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(monthOfDate("2026-12-31")).toBe("2026-12");
  });

  it("días por mes", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("formatea en español", () => {
    const label = formatMonth("2026-11");
    expect(label).toMatch(/nov/i);
    expect(label).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/month.test.ts`
Expected: FAIL, no se puede resolver `./month`.

- [ ] **Step 3: Implementar**

```ts
/** Mes en formato "YYYY-MM". Se ordena correctamente como string. */
export type Month = string;

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function toMonth(year: number, month: number): Month {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonth(m: Month): { year: number; month: number } {
  const [year, month] = m.split("-").map(Number);
  return { year, month };
}

function index(m: Month): number {
  const { year, month } = parseMonth(m);
  return year * 12 + (month - 1);
}

export function addMonths(m: Month, n: number): Month {
  const i = index(m) + n;
  return toMonth(Math.floor(i / 12), (i % 12) + 1);
}

export function monthDiff(from: Month, to: Month): number {
  return index(to) - index(from);
}

export function monthRange(from: Month, count: number): Month[] {
  return Array.from({ length: count }, (_, i) => addMonths(from, i));
}

export function currentMonth(now: Date = new Date()): Month {
  return toMonth(now.getFullYear(), now.getMonth() + 1);
}

export function todayIso(now: Date = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

export function monthOfDate(isoDate: string): Month {
  return isoDate.slice(0, 7);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

export function formatMonth(m: Month): string {
  const { year, month } = parseMonth(m);
  return monthFormatter.format(new Date(year, month - 1, 1));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/month.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/month.ts src/domain/month.test.ts
git commit -m "feat(domain): add month utilities" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `domain/schemas.ts` + factories de test

**Files:**
- Create: `src/domain/schemas.ts`, `src/test/factories.ts`
- Test: `src/domain/schemas.test.ts`

**Interfaces:**
- Consumes: `CURRENCIES`, `Currency`, `Money` (Task 2); `MONTH_RE` (Task 3)
- Produces:
  - `entitySchema`, `type Entity = { id: string; createdAt: string; updatedAt: string; deletedAt?: string }`
  - `cardInputSchema`/`cardSchema`, `type CardInput`, `type Card` (`name`, `color`, `closingDay?`, `dueDay?`, `archived: boolean`)
  - `purchaseInputSchema`/`purchaseSchema`, `type PurchaseInput`, `type Purchase` (`cardId`, `description`, `currency`, `installmentAmount`, `installmentsCount`, `firstMonth`, `purchaseDate?`, `category?`)
  - `incomeInputSchema`/`incomeSchema`, `type IncomeInput`, `type Income` (`name`, `amount`, `currency`, `startMonth`, `endMonth?`)
  - `fixedExpenseInputSchema`/`fixedExpenseSchema`, `type FixedExpenseInput`, `type FixedExpense` (lo mismo que Income + `category`)
  - `budgetCategoryInputSchema`/`budgetCategorySchema`, `type BudgetCategoryInput`, `type BudgetCategory` (`name`, `monthlyAmount`, `currency`)
  - Factories: `makeCard`, `makePurchase`, `makeIncome`, `makeFixedExpense`, `makeCategory` (cada uno `(overrides?: Partial<T>) => T`)

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import {
  budgetCategoryInputSchema, cardInputSchema, fixedExpenseInputSchema, incomeInputSchema,
  purchaseInputSchema, purchaseSchema,
} from "./schemas";

const validPurchase = {
  cardId: "c1",
  description: "Heladera",
  currency: "ARS",
  installmentAmount: 1000000,
  installmentsCount: 12,
  firstMonth: "2026-10",
};

describe("purchaseInputSchema", () => {
  it("acepta compra válida", () => {
    expect(purchaseInputSchema.safeParse(validPurchase).success).toBe(true);
  });
  it.each([0, 73, 1.5])("rechaza %s cuotas", (installmentsCount) => {
    expect(purchaseInputSchema.safeParse({ ...validPurchase, installmentsCount }).success).toBe(false);
  });
  it("rechaza monto 0, NaN o decimal", () => {
    for (const installmentAmount of [0, Number.NaN, 10.5]) {
      expect(purchaseInputSchema.safeParse({ ...validPurchase, installmentAmount }).success).toBe(false);
    }
  });
  it("rechaza mes inválido y descripción vacía", () => {
    const r = purchaseInputSchema.safeParse({ ...validPurchase, firstMonth: "2026-13", description: "  " });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("firstMonth");
      expect(paths).toContain("description");
    }
  });
  it("purchaseSchema exige campos de entidad", () => {
    expect(purchaseSchema.safeParse(validPurchase).success).toBe(false);
    expect(
      purchaseSchema.safeParse({ ...validPurchase, id: "x", createdAt: "a", updatedAt: "b" }).success,
    ).toBe(true);
  });
});

describe("cardInputSchema", () => {
  it("archived es false por defecto", () => {
    const r = cardInputSchema.parse({ name: "Visa", color: "#112233" });
    expect(r.archived).toBe(false);
  });
  it("rechaza día de cierre fuera de rango", () => {
    expect(cardInputSchema.safeParse({ name: "Visa", color: "#112233", closingDay: 32 }).success).toBe(false);
  });
});

describe("períodos", () => {
  const income = { name: "Sueldo", amount: 100, currency: "ARS", startMonth: "2026-05" };
  it("acepta sin fin", () => {
    expect(incomeInputSchema.safeParse(income).success).toBe(true);
  });
  it("rechaza fin anterior al inicio con error en endMonth", () => {
    const r = incomeInputSchema.safeParse({ ...income, endMonth: "2026-04" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["endMonth"]);
  });
  it("gasto fijo exige categoría", () => {
    expect(fixedExpenseInputSchema.safeParse(income).success).toBe(false);
    expect(fixedExpenseInputSchema.safeParse({ ...income, category: "Vivienda" }).success).toBe(true);
  });
});

describe("budgetCategoryInputSchema", () => {
  it("permite 0 y rechaza negativos", () => {
    const base = { name: "Comida", currency: "ARS" };
    expect(budgetCategoryInputSchema.safeParse({ ...base, monthlyAmount: 0 }).success).toBe(true);
    expect(budgetCategoryInputSchema.safeParse({ ...base, monthlyAmount: -1 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/schemas.test.ts`
Expected: FAIL, no se puede resolver `./schemas`.

- [ ] **Step 3: Implementar `src/domain/schemas.ts`**

```ts
import { z } from "zod";
import { CURRENCIES } from "./money";
import { MONTH_RE } from "./month";

const entityShape = {
  id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
};
export const entitySchema = z.object(entityShape);
export type Entity = z.infer<typeof entitySchema>;

export const currencySchema = z.enum(CURRENCIES);
export const monthSchema = z.string().regex(MONTH_RE, { message: "Mes inválido" });

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "Obligatorio" })
    .max(max, { message: `Máximo ${max} caracteres` });

const positiveMoney = z
  .number({ message: "Monto inválido" })
  .int({ message: "Monto inválido" })
  .positive({ message: "Debe ser mayor a 0" });

const dayOfMonth = z
  .number({ message: "Entre 1 y 31" })
  .int({ message: "Entre 1 y 31" })
  .min(1, { message: "Entre 1 y 31" })
  .max(31, { message: "Entre 1 y 31" });

// Tarjetas
export const cardInputSchema = z.object({
  name: text(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "Color inválido" }),
  closingDay: dayOfMonth.optional(),
  dueDay: dayOfMonth.optional(),
  archived: z.boolean().default(false),
});
export const cardSchema = cardInputSchema.extend(entityShape);
export type CardInput = z.infer<typeof cardInputSchema>;
export type Card = z.infer<typeof cardSchema>;

// Compras
export const purchaseInputSchema = z.object({
  cardId: z.string().min(1, { message: "Elegí una tarjeta" }),
  description: text(80),
  currency: currencySchema,
  installmentAmount: positiveMoney,
  installmentsCount: z
    .number({ message: "Entero entre 1 y 72" })
    .int({ message: "Entero entre 1 y 72" })
    .min(1, { message: "Entero entre 1 y 72" })
    .max(72, { message: "Entero entre 1 y 72" }),
  firstMonth: monthSchema,
  purchaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida" })
    .optional(),
  category: z.string().trim().max(40, { message: "Máximo 40 caracteres" }).optional(),
});
export const purchaseSchema = purchaseInputSchema.extend(entityShape);
export type PurchaseInput = z.infer<typeof purchaseInputSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;

// Ingresos y gastos fijos (recurrentes con vigencia)
const periodOk = (v: { startMonth: string; endMonth?: string }) =>
  v.endMonth === undefined || v.endMonth >= v.startMonth;
const periodError = {
  message: "El mes de fin debe ser igual o posterior al de inicio",
  path: ["endMonth"],
};

const incomeFields = z.object({
  name: text(40),
  amount: positiveMoney,
  currency: currencySchema,
  startMonth: monthSchema,
  endMonth: monthSchema.optional(),
});
export const incomeInputSchema = incomeFields.refine(periodOk, periodError);
export const incomeSchema = incomeFields.extend(entityShape).refine(periodOk, periodError);
export type IncomeInput = z.infer<typeof incomeInputSchema>;
export type Income = z.infer<typeof incomeSchema>;

const fixedExpenseFields = incomeFields.extend({ category: text(40) });
export const fixedExpenseInputSchema = fixedExpenseFields.refine(periodOk, periodError);
export const fixedExpenseSchema = fixedExpenseFields
  .extend(entityShape)
  .refine(periodOk, periodError);
export type FixedExpenseInput = z.infer<typeof fixedExpenseInputSchema>;
export type FixedExpense = z.infer<typeof fixedExpenseSchema>;

// Categorías de presupuesto variable
export const budgetCategoryInputSchema = z.object({
  name: text(40),
  monthlyAmount: z
    .number({ message: "Monto inválido" })
    .int({ message: "Monto inválido" })
    .min(0, { message: "No puede ser negativo" }),
  currency: currencySchema,
});
export const budgetCategorySchema = budgetCategoryInputSchema.extend(entityShape);
export type BudgetCategoryInput = z.infer<typeof budgetCategoryInputSchema>;
export type BudgetCategory = z.infer<typeof budgetCategorySchema>;
```

- [ ] **Step 4: Crear `src/test/factories.ts`**

```ts
import type { BudgetCategory, Card, FixedExpense, Income, Purchase } from "../domain/schemas";

let seq = 0;
function base() {
  seq += 1;
  return {
    id: `id-${seq}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function makeCard(overrides: Partial<Card> = {}): Card {
  return { ...base(), name: "Visa", color: "#6366f1", archived: false, ...overrides };
}

export function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    ...base(),
    cardId: "card-1",
    description: "Compra",
    currency: "ARS",
    installmentAmount: 100000,
    installmentsCount: 3,
    firstMonth: "2026-10",
    ...overrides,
  };
}

export function makeIncome(overrides: Partial<Income> = {}): Income {
  return { ...base(), name: "Sueldo", amount: 50000000, currency: "ARS", startMonth: "2026-01", ...overrides };
}

export function makeFixedExpense(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    ...base(),
    name: "Alquiler",
    amount: 20000000,
    currency: "ARS",
    startMonth: "2026-01",
    category: "Vivienda",
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<BudgetCategory> = {}): BudgetCategory {
  return { ...base(), name: "Comida", monthlyAmount: 10000000, currency: "ARS", ...overrides };
}
```

- [ ] **Step 5: Correr los tests y el typecheck**

Run: `npx vitest run src/domain/schemas.test.ts && npm run typecheck`
Expected: PASS, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add src/domain/schemas.ts src/domain/schemas.test.ts src/test/factories.ts
git commit -m "feat(domain): add zod schemas and entity types" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `domain/installments.ts`

**Files:**
- Create: `src/domain/installments.ts`
- Test: `src/domain/installments.test.ts`

**Interfaces:**
- Consumes: `Purchase` (Task 4); `Month`, `addMonths`, `monthDiff` (Task 3); `Money`, `Currency` (Task 2)
- Produces:
  - `interface Installment { purchaseId: string; cardId: string; description: string; currency: Currency; month: Month; number: number; total: number; amount: Money }`
  - `installmentsOf(p: Purchase): Installment[]`
  - `lastMonth(p: Purchase): Month`
  - `isActiveIn(p: Purchase, m: Month): boolean`
  - `installmentNumberIn(p: Purchase, m: Month): number | null`
  - `isFinished(p: Purchase, current: Month): boolean`
  - `paidCount(p: Purchase, current: Month): number` (cuotas con mes < current)
  - `remainingAmount(p: Purchase, from: Month): Money` (cuotas con mes ≥ from)
  - `installmentsInMonth(purchases: Purchase[], m: Month): Installment[]`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { makePurchase } from "../test/factories";
import {
  installmentNumberIn, installmentsInMonth, installmentsOf, isActiveIn, isFinished, lastMonth,
  paidCount, remainingAmount,
} from "./installments";

describe("installments", () => {
  const p = makePurchase({ firstMonth: "2026-11", installmentsCount: 3, installmentAmount: 100000 });

  it("genera cuotas cruzando el año", () => {
    const list = installmentsOf(p);
    expect(list.map((i) => i.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(list.map((i) => i.number)).toEqual([1, 2, 3]);
    expect(list.every((i) => i.total === 3 && i.amount === 100000 && i.purchaseId === p.id)).toBe(true);
  });

  it("calcula último mes (incluye 72 cuotas)", () => {
    expect(lastMonth(p)).toBe("2027-01");
    expect(lastMonth(makePurchase({ firstMonth: "2026-10", installmentsCount: 72 }))).toBe("2032-09");
    expect(lastMonth(makePurchase({ firstMonth: "2026-10", installmentsCount: 1 }))).toBe("2026-10");
  });

  it("activa sólo entre primera y última", () => {
    expect(isActiveIn(p, "2026-10")).toBe(false);
    expect(isActiveIn(p, "2026-11")).toBe(true);
    expect(isActiveIn(p, "2027-01")).toBe(true);
    expect(isActiveIn(p, "2027-02")).toBe(false);
  });

  it("número de cuota del mes", () => {
    expect(installmentNumberIn(p, "2026-12")).toBe(2);
    expect(installmentNumberIn(p, "2027-02")).toBeNull();
  });

  it("terminada después del último mes", () => {
    expect(isFinished(p, "2027-01")).toBe(false);
    expect(isFinished(p, "2027-02")).toBe(true);
  });

  it("pagadas y restante", () => {
    expect(paidCount(p, "2026-09")).toBe(0);
    expect(paidCount(p, "2026-12")).toBe(1);
    expect(paidCount(p, "2027-05")).toBe(3);
    expect(remainingAmount(p, "2026-12")).toBe(200000);
    expect(remainingAmount(p, "2026-01")).toBe(300000);
    expect(remainingAmount(p, "2027-02")).toBe(0);
  });

  it("cuotas de un mes para varias compras", () => {
    const q = makePurchase({ firstMonth: "2026-12", installmentsCount: 1, installmentAmount: 5000 });
    const list = installmentsInMonth([p, q], "2026-12");
    expect(list).toHaveLength(2);
    expect(list.find((i) => i.purchaseId === q.id)?.number).toBe(1);
    expect(installmentsInMonth([p, q], "2027-03")).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/installments.test.ts`
Expected: FAIL, no se puede resolver `./installments`.

- [ ] **Step 3: Implementar**

```ts
import type { Currency, Money } from "./money";
import { addMonths, monthDiff, type Month } from "./month";
import type { Purchase } from "./schemas";

export interface Installment {
  purchaseId: string;
  cardId: string;
  description: string;
  currency: Currency;
  month: Month;
  number: number;
  total: number;
  amount: Money;
}

function installmentAt(p: Purchase, number: number): Installment {
  return {
    purchaseId: p.id,
    cardId: p.cardId,
    description: p.description,
    currency: p.currency,
    month: addMonths(p.firstMonth, number - 1),
    number,
    total: p.installmentsCount,
    amount: p.installmentAmount,
  };
}

export function installmentsOf(p: Purchase): Installment[] {
  return Array.from({ length: p.installmentsCount }, (_, i) => installmentAt(p, i + 1));
}

export function lastMonth(p: Purchase): Month {
  return addMonths(p.firstMonth, p.installmentsCount - 1);
}

export function isActiveIn(p: Purchase, m: Month): boolean {
  return p.firstMonth <= m && m <= lastMonth(p);
}

export function installmentNumberIn(p: Purchase, m: Month): number | null {
  return isActiveIn(p, m) ? monthDiff(p.firstMonth, m) + 1 : null;
}

export function isFinished(p: Purchase, current: Month): boolean {
  return lastMonth(p) < current;
}

export function paidCount(p: Purchase, current: Month): number {
  return Math.max(0, Math.min(p.installmentsCount, monthDiff(p.firstMonth, current)));
}

export function remainingAmount(p: Purchase, from: Month): Money {
  return (p.installmentsCount - paidCount(p, from)) * p.installmentAmount;
}

export function installmentsInMonth(purchases: Purchase[], m: Month): Installment[] {
  return purchases.flatMap((p) => {
    const n = installmentNumberIn(p, m);
    return n === null ? [] : [installmentAt(p, n)];
  });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/installments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/installments.ts src/domain/installments.test.ts
git commit -m "feat(domain): derive installments from purchases" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: `domain/closing.ts`

**Files:**
- Create: `src/domain/closing.ts`
- Test: `src/domain/closing.test.ts`

**Interfaces:**
- Consumes: `Card` (Task 4); `addMonths`, `daysInMonth`, `monthOfDate`, `toMonth`, `Month` (Task 3)
- Produces:
  - `suggestFirstMonth(purchaseDate: string, card: Pick<Card, "closingDay" | "dueDay">): Month | null`
  - `defaultFirstMonth(purchaseDate: string): Month` (mes siguiente al de la compra)

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { defaultFirstMonth, suggestFirstMonth } from "./closing";

describe("suggestFirstMonth", () => {
  it("sin cierre no sugiere", () => {
    expect(suggestFirstMonth("2026-09-10", {})).toBeNull();
  });

  it("compra antes del cierre, sin vencimiento: paga mes siguiente", () => {
    expect(suggestFirstMonth("2026-09-10", { closingDay: 25 })).toBe("2026-10");
  });

  it("compra el mismo día del cierre entra en ese resumen", () => {
    expect(suggestFirstMonth("2026-09-25", { closingDay: 25 })).toBe("2026-10");
  });

  it("compra después del cierre pasa al resumen siguiente", () => {
    expect(suggestFirstMonth("2026-09-26", { closingDay: 25 })).toBe("2026-11");
  });

  it("vencimiento posterior al cierre en el mismo mes: paga ese mes", () => {
    expect(suggestFirstMonth("2026-09-02", { closingDay: 3, dueDay: 15 })).toBe("2026-09");
  });

  it("vencimiento menor al cierre: paga mes siguiente", () => {
    expect(suggestFirstMonth("2026-09-10", { closingDay: 25, dueDay: 5 })).toBe("2026-10");
  });

  it("cierre 31 en febrero usa el último día", () => {
    expect(suggestFirstMonth("2026-02-28", { closingDay: 31 })).toBe("2026-03");
  });

  it("cruce de año", () => {
    expect(suggestFirstMonth("2026-12-21", { closingDay: 20 })).toBe("2027-02");
    expect(suggestFirstMonth("2026-12-10", { closingDay: 20 })).toBe("2027-01");
  });
});

describe("defaultFirstMonth", () => {
  it("mes siguiente, cruzando año", () => {
    expect(defaultFirstMonth("2026-09-10")).toBe("2026-10");
    expect(defaultFirstMonth("2026-12-15")).toBe("2027-01");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/closing.test.ts`
Expected: FAIL, no se puede resolver `./closing`.

- [ ] **Step 3: Implementar**

```ts
import { addMonths, daysInMonth, monthOfDate, toMonth, type Month } from "./month";
import type { Card } from "./schemas";

export function defaultFirstMonth(purchaseDate: string): Month {
  return addMonths(monthOfDate(purchaseDate), 1);
}

/** Regla del spec §5.1: el "mes de la cuota" es el mes en que se paga. */
export function suggestFirstMonth(
  purchaseDate: string,
  card: Pick<Card, "closingDay" | "dueDay">,
): Month | null {
  if (card.closingDay === undefined) return null;
  const [year, month, day] = purchaseDate.split("-").map(Number);
  const effectiveClosing = Math.min(card.closingDay, daysInMonth(year, month));
  const purchaseMonth = toMonth(year, month);
  const closingMonth = day <= effectiveClosing ? purchaseMonth : addMonths(purchaseMonth, 1);
  const paysSameMonth = card.dueDay !== undefined && card.dueDay > card.closingDay;
  return paysSameMonth ? closingMonth : addMonths(closingMonth, 1);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/closing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/closing.ts src/domain/closing.test.ts
git commit -m "feat(domain): suggest first installment month from card closing" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `domain/budget.ts`

**Files:**
- Create: `src/domain/budget.ts`
- Test: `src/domain/budget.test.ts`

**Interfaces:**
- Consumes: `isActiveIn` (Task 5); entidades (Task 4); `CURRENCIES`, `Currency`, `Money` (Task 2)
- Produces:
  - `type ByCurrency<T> = Partial<Record<Currency, T>>`
  - `interface MonthBreakdown { income: Money; fixed: Money; installments: Money; variable: Money; available: Money }`
  - `interface BudgetData { purchases: Purchase[]; incomes: Income[]; fixedExpenses: FixedExpense[]; categories: BudgetCategory[] }`
  - `emptyBreakdown(): MonthBreakdown`
  - `appliesIn(item: { startMonth: Month; endMonth?: Month }, m: Month): boolean`
  - `monthBreakdown(data: BudgetData, m: Month): ByCurrency<MonthBreakdown>` (incluye sólo monedas con algún dato aplicable)

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { makeCategory, makeFixedExpense, makeIncome, makePurchase } from "../test/factories";
import { appliesIn, monthBreakdown, type BudgetData } from "./budget";

const data: BudgetData = {
  incomes: [makeIncome({ amount: 50000000 })],
  fixedExpenses: [makeFixedExpense({ amount: 20000000 })],
  categories: [makeCategory({ monthlyAmount: 10000000 })],
  purchases: [makePurchase({ firstMonth: "2026-10", installmentsCount: 3, installmentAmount: 100000 })],
};

describe("appliesIn", () => {
  it("respeta inicio y fin inclusivos", () => {
    const item = { startMonth: "2026-03", endMonth: "2026-05" };
    expect(appliesIn(item, "2026-02")).toBe(false);
    expect(appliesIn(item, "2026-03")).toBe(true);
    expect(appliesIn(item, "2026-05")).toBe(true);
    expect(appliesIn(item, "2026-06")).toBe(false);
    expect(appliesIn({ startMonth: "2026-03" }, "2099-01")).toBe(true);
  });
});

describe("monthBreakdown", () => {
  it("calcula disponible del mes", () => {
    expect(monthBreakdown(data, "2026-10").ARS).toEqual({
      income: 50000000,
      fixed: 20000000,
      installments: 100000,
      variable: 10000000,
      available: 19900000,
    });
  });

  it("no cuenta cuotas fuera de rango", () => {
    expect(monthBreakdown(data, "2027-01").ARS?.installments).toBe(0);
  });

  it("respeta fin de ingresos", () => {
    const d = { ...data, incomes: [makeIncome({ amount: 100, endMonth: "2026-09" })] };
    expect(monthBreakdown(d, "2026-10").ARS?.income).toBe(0);
    expect(monthBreakdown(d, "2026-09").ARS?.income).toBe(100);
  });

  it("separa monedas sin mezclar", () => {
    const d = {
      ...data,
      purchases: [...data.purchases, makePurchase({ currency: "USD", installmentAmount: 5000, firstMonth: "2026-10" })],
    };
    const b = monthBreakdown(d, "2026-10");
    expect(b.USD).toEqual({ income: 0, fixed: 0, installments: 5000, variable: 0, available: -5000 });
    expect(b.ARS?.installments).toBe(100000);
  });

  it("sin datos devuelve objeto vacío", () => {
    expect(monthBreakdown({ incomes: [], fixedExpenses: [], categories: [], purchases: [] }, "2026-10")).toEqual({});
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/budget.test.ts`
Expected: FAIL, no se puede resolver `./budget`.

- [ ] **Step 3: Implementar**

```ts
import { isActiveIn } from "./installments";
import { CURRENCIES, type Currency, type Money } from "./money";
import type { Month } from "./month";
import type { BudgetCategory, FixedExpense, Income, Purchase } from "./schemas";

export type ByCurrency<T> = Partial<Record<Currency, T>>;

export interface MonthBreakdown {
  income: Money;
  fixed: Money;
  installments: Money;
  variable: Money;
  available: Money;
}

export interface BudgetData {
  purchases: Purchase[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  categories: BudgetCategory[];
}

export function emptyBreakdown(): MonthBreakdown {
  return { income: 0, fixed: 0, installments: 0, variable: 0, available: 0 };
}

export function appliesIn(item: { startMonth: Month; endMonth?: Month }, m: Month): boolean {
  return item.startMonth <= m && (item.endMonth === undefined || m <= item.endMonth);
}

type Component = Exclude<keyof MonthBreakdown, "available">;

export function monthBreakdown(data: BudgetData, m: Month): ByCurrency<MonthBreakdown> {
  const out: ByCurrency<MonthBreakdown> = {};
  const add = (currency: Currency, key: Component, amount: Money) => {
    const b = (out[currency] ??= emptyBreakdown());
    b[key] += amount;
  };

  for (const i of data.incomes) if (appliesIn(i, m)) add(i.currency, "income", i.amount);
  for (const f of data.fixedExpenses) if (appliesIn(f, m)) add(f.currency, "fixed", f.amount);
  for (const p of data.purchases) if (isActiveIn(p, m)) add(p.currency, "installments", p.installmentAmount);
  for (const c of data.categories) add(c.currency, "variable", c.monthlyAmount);

  for (const currency of CURRENCIES) {
    const b = out[currency];
    if (b) b.available = b.income - b.fixed - b.installments - b.variable;
  }
  return out;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/budget.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/budget.ts src/domain/budget.test.ts
git commit -m "feat(domain): compute monthly budget breakdown per currency" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `domain/projection.ts`

**Files:**
- Create: `src/domain/projection.ts`
- Test: `src/domain/projection.test.ts`

**Interfaces:**
- Consumes: `monthBreakdown`, `BudgetData`, `ByCurrency`, `MonthBreakdown` (Task 7); `installmentsInMonth`, `installmentsOf`, `isActiveIn`, `lastMonth`, `remainingAmount`, `Installment` (Task 5); `monthRange` (Task 3)
- Produces:
  - `interface MonthProjection { month: Month; breakdown: ByCurrency<MonthBreakdown>; byCard: ByCurrency<Record<string, Money>>; installments: Installment[] }`
  - `project(data: BudgetData, from: Month, count: number): MonthProjection[]`
  - `interface CardSummary { cardId: string; currency: Currency; thisMonth: Money; activeCount: number; lastMonth: Month; remaining: Money }`
  - `cardSummaries(purchases: Purchase[], current: Month): CardSummary[]` (sólo compras con `lastMonth >= current`)
  - `interface PreviewRow { month: Month; before: Money; after: Money }`
  - `previewPurchase(data: BudgetData, draft: Purchase): PreviewRow[]` (reemplaza la compra con el mismo `id` si ya existe)

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import { makeIncome, makePurchase } from "../test/factories";
import type { BudgetData } from "./budget";
import { cardSummaries, previewPurchase, project } from "./projection";

const empty: BudgetData = { purchases: [], incomes: [], fixedExpenses: [], categories: [] };

describe("project", () => {
  it("devuelve count meses desde from, agregando por tarjeta", () => {
    const a = makePurchase({ cardId: "c1", firstMonth: "2026-10", installmentsCount: 2, installmentAmount: 1000 });
    const b = makePurchase({ cardId: "c1", firstMonth: "2026-11", installmentsCount: 1, installmentAmount: 500 });
    const c = makePurchase({ cardId: "c2", firstMonth: "2026-11", installmentsCount: 1, installmentAmount: 300 });
    const result = project({ ...empty, purchases: [a, b, c] }, "2026-10", 3);
    expect(result.map((r) => r.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(result[1].byCard.ARS).toEqual({ c1: 1500, c2: 300 });
    expect(result[1].installments).toHaveLength(3);
    expect(result[1].breakdown.ARS?.installments).toBe(1800);
    expect(result[2].byCard).toEqual({});
  });
});

describe("cardSummaries", () => {
  it("resume compras pendientes por tarjeta y moneda", () => {
    const a = makePurchase({ cardId: "c1", firstMonth: "2026-08", installmentsCount: 3, installmentAmount: 100000 });
    const b = makePurchase({ cardId: "c1", firstMonth: "2026-10", installmentsCount: 6, installmentAmount: 50000 });
    const done = makePurchase({ cardId: "c1", firstMonth: "2026-01", installmentsCount: 2 });
    const usd = makePurchase({ cardId: "c1", currency: "USD", firstMonth: "2026-09", installmentsCount: 1, installmentAmount: 700 });
    const result = cardSummaries([a, b, done, usd], "2026-09");
    expect(result).toContainEqual({
      cardId: "c1", currency: "ARS", thisMonth: 100000, activeCount: 2, lastMonth: "2027-03", remaining: 500000,
    });
    expect(result).toContainEqual({
      cardId: "c1", currency: "USD", thisMonth: 700, activeCount: 1, lastMonth: "2026-09", remaining: 700,
    });
    expect(result).toHaveLength(2);
  });
});

describe("previewPurchase", () => {
  const data: BudgetData = { ...empty, incomes: [makeIncome({ amount: 10000 })] };

  it("compra nueva: after = before - cuota en cada mes", () => {
    const draft = makePurchase({ id: "draft", firstMonth: "2026-10", installmentsCount: 2, installmentAmount: 4000 });
    expect(previewPurchase(data, draft)).toEqual([
      { month: "2026-10", before: 10000, after: 6000 },
      { month: "2026-11", before: 10000, after: 6000 },
    ]);
  });

  it("marca meses negativos", () => {
    const draft = makePurchase({ id: "draft", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 15000 });
    expect(previewPurchase(data, draft)[0].after).toBe(-5000);
  });

  it("editar no cuenta dos veces la compra original", () => {
    const original = makePurchase({ id: "p1", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 1000 });
    const edited = { ...original, installmentAmount: 3000 };
    const [row] = previewPurchase({ ...data, purchases: [original] }, edited);
    expect(row).toEqual({ month: "2026-10", before: 9000, after: 7000 });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/domain/projection.test.ts`
Expected: FAIL, no se puede resolver `./projection`.

- [ ] **Step 3: Implementar**

```ts
import { monthBreakdown, type BudgetData, type ByCurrency, type MonthBreakdown } from "./budget";
import {
  installmentsInMonth, installmentsOf, isActiveIn, lastMonth, remainingAmount, type Installment,
} from "./installments";
import type { Currency, Money } from "./money";
import { monthRange, type Month } from "./month";
import type { Purchase } from "./schemas";

export interface MonthProjection {
  month: Month;
  breakdown: ByCurrency<MonthBreakdown>;
  byCard: ByCurrency<Record<string, Money>>;
  installments: Installment[];
}

export function project(data: BudgetData, from: Month, count: number): MonthProjection[] {
  return monthRange(from, count).map((month) => {
    const installments = installmentsInMonth(data.purchases, month);
    const byCard: ByCurrency<Record<string, Money>> = {};
    for (const i of installments) {
      const row = (byCard[i.currency] ??= {});
      row[i.cardId] = (row[i.cardId] ?? 0) + i.amount;
    }
    return { month, breakdown: monthBreakdown(data, month), byCard, installments };
  });
}

export interface CardSummary {
  cardId: string;
  currency: Currency;
  thisMonth: Money;
  activeCount: number;
  lastMonth: Month;
  remaining: Money;
}

export function cardSummaries(purchases: Purchase[], current: Month): CardSummary[] {
  const byKey = new Map<string, CardSummary>();
  for (const p of purchases) {
    const last = lastMonth(p);
    if (last < current) continue;
    const key = `${p.cardId}|${p.currency}`;
    let s = byKey.get(key);
    if (!s) {
      s = { cardId: p.cardId, currency: p.currency, thisMonth: 0, activeCount: 0, lastMonth: last, remaining: 0 };
      byKey.set(key, s);
    }
    s.activeCount += 1;
    if (isActiveIn(p, current)) s.thisMonth += p.installmentAmount;
    if (last > s.lastMonth) s.lastMonth = last;
    s.remaining += remainingAmount(p, current);
  }
  return [...byKey.values()];
}

export interface PreviewRow {
  month: Month;
  before: Money;
  after: Money;
}

export function previewPurchase(data: BudgetData, draft: Purchase): PreviewRow[] {
  const after: BudgetData = {
    ...data,
    purchases: [...data.purchases.filter((p) => p.id !== draft.id), draft],
  };
  return installmentsOf(draft).map(({ month }) => ({
    month,
    before: monthBreakdown(data, month)[draft.currency]?.available ?? 0,
    after: monthBreakdown(after, month)[draft.currency]?.available ?? 0,
  }));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/domain/projection.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/projection.ts src/domain/projection.test.ts
git commit -m "feat(domain): add projection, card summaries and purchase preview" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Capa de datos (Dexie + Repository)

**Files:**
- Create: `src/data/db.ts`, `src/data/repository.ts`, `src/data/dexieRepository.ts`, `src/data/repos.ts`, `src/data/storage.ts`
- Test: `src/data/dexieRepository.test.ts`

**Interfaces:**
- Consumes: tipos de entidades (Task 4)
- Produces:
  - `SCHEMA_VERSION = 1`, `interface Meta { key: "meta"; schemaVersion: number; lastBackupAt?: string }`
  - `type CuotasDB` (tablas `cards`, `purchases`, `incomes`, `fixedExpenses`, `categories`, `meta`), `createDb(name?: string): CuotasDB`
  - `getMeta(db): Promise<Meta>`, `setLastBackupAt(db, iso: string): Promise<void>`
  - `interface Repository<T extends Entity> { list(): Promise<T[]>; get(id: string): Promise<T | undefined>; put(entity: T): Promise<void>; remove(id: string): Promise<void>; subscribe(cb: (items: T[]) => void): () => void }`
  - `newEntity<F extends object>(fields: F, now?: Date): F & Entity`
  - `createDexieRepository<T extends Entity>(table: EntityTable<T, "id">): Repository<T>`
  - `interface Repos { cards; purchases; incomes; fixedExpenses; categories }`, `createRepos(db: CuotasDB): Repos`
  - `requestPersistence(): Promise<boolean>`, `isStorageAvailable(db: CuotasDB): Promise<boolean>`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard } from "../test/factories";
import { createDb, getMeta, setLastBackupAt, SCHEMA_VERSION, type CuotasDB } from "./db";
import { createDexieRepository } from "./dexieRepository";
import { newEntity, type Repository } from "./repository";
import type { Card } from "../domain/schemas";

let db: CuotasDB;
let repo: Repository<Card>;

beforeEach(() => {
  db = createDb(`test-${crypto.randomUUID()}`);
  repo = createDexieRepository(db.cards);
});

afterEach(async () => {
  await db.delete();
});

describe("newEntity", () => {
  it("agrega id y timestamps", () => {
    const e = newEntity({ name: "x" }, new Date("2026-09-30T10:00:00.000Z"));
    expect(e.id).toMatch(/[0-9a-f-]{36}/);
    expect(e.createdAt).toBe("2026-09-30T10:00:00.000Z");
    expect(e.updatedAt).toBe(e.createdAt);
    expect(e.name).toBe("x");
  });
});

describe("dexie repository", () => {
  it("put, get y list", async () => {
    const card = makeCard();
    await repo.put(card);
    expect((await repo.get(card.id))?.name).toBe("Visa");
    expect(await repo.list()).toHaveLength(1);
  });

  it("put actualiza updatedAt", async () => {
    const card = makeCard({ updatedAt: "2000-01-01T00:00:00.000Z" });
    await repo.put(card);
    expect((await repo.get(card.id))?.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });

  it("remove es borrado lógico", async () => {
    const card = makeCard();
    await repo.put(card);
    await repo.remove(card.id);
    expect(await repo.list()).toEqual([]);
    expect(await repo.get(card.id)).toBeUndefined();
    const raw = await db.cards.get(card.id);
    expect(raw?.deletedAt).toBeDefined();
  });

  it("subscribe emite cambios", async () => {
    const seen: Card[][] = [];
    const unsubscribe = repo.subscribe((items) => seen.push(items));
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0));
    await repo.put(makeCard({ name: "Master" }));
    await vi.waitFor(() => expect(seen.at(-1)?.map((c) => c.name)).toEqual(["Master"]));
    unsubscribe();
  });
});

describe("meta", () => {
  it("default y lastBackupAt", async () => {
    expect(await getMeta(db)).toEqual({ key: "meta", schemaVersion: SCHEMA_VERSION });
    await setLastBackupAt(db, "2026-09-30T00:00:00.000Z");
    expect((await getMeta(db)).lastBackupAt).toBe("2026-09-30T00:00:00.000Z");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/data/dexieRepository.test.ts`
Expected: FAIL, no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `src/data/db.ts`**

```ts
import Dexie, { type EntityTable } from "dexie";
import type { BudgetCategory, Card, FixedExpense, Income, Purchase } from "../domain/schemas";

export const SCHEMA_VERSION = 1;

export interface Meta {
  key: "meta";
  schemaVersion: number;
  lastBackupAt?: string;
}

export type CuotasDB = Dexie & {
  cards: EntityTable<Card, "id">;
  purchases: EntityTable<Purchase, "id">;
  incomes: EntityTable<Income, "id">;
  fixedExpenses: EntityTable<FixedExpense, "id">;
  categories: EntityTable<BudgetCategory, "id">;
  meta: EntityTable<Meta, "key">;
};

export function createDb(name = "cuotas"): CuotasDB {
  const db = new Dexie(name) as CuotasDB;
  // Migraciones futuras: agregar db.version(2).stores(...).upgrade(...) sin tocar la versión 1.
  db.version(1).stores({
    cards: "id",
    purchases: "id, cardId",
    incomes: "id",
    fixedExpenses: "id",
    categories: "id",
    meta: "key",
  });
  return db;
}

export async function getMeta(db: CuotasDB): Promise<Meta> {
  return (await db.meta.get("meta")) ?? { key: "meta", schemaVersion: SCHEMA_VERSION };
}

export async function setLastBackupAt(db: CuotasDB, iso: string): Promise<void> {
  const meta = await getMeta(db);
  await db.meta.put({ ...meta, lastBackupAt: iso });
}
```

- [ ] **Step 4: Implementar `src/data/repository.ts`**

```ts
import type { Entity } from "../domain/schemas";

/** Contrato estable. v3 agrega una implementación nube sin cambiar la UI ni el dominio. */
export interface Repository<T extends Entity> {
  /** Excluye borrados lógicos. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  /** Crea o actualiza. Setea updatedAt. */
  put(entity: T): Promise<void>;
  /** Borrado lógico: setea deletedAt. */
  remove(id: string): Promise<void>;
  subscribe(cb: (items: T[]) => void): () => void;
}

export function newEntity<F extends object>(fields: F, now: Date = new Date()): F & Entity {
  const ts = now.toISOString();
  return { ...fields, id: crypto.randomUUID(), createdAt: ts, updatedAt: ts };
}
```

- [ ] **Step 5: Implementar `src/data/dexieRepository.ts`**

```ts
import { liveQuery, type EntityTable } from "dexie";
import type { Entity } from "../domain/schemas";
import type { Repository } from "./repository";

export function createDexieRepository<T extends Entity>(table: EntityTable<T, "id">): Repository<T> {
  const list = async () => (await table.toArray()).filter((e) => !e.deletedAt);

  return {
    list,
    async get(id) {
      const e = await table.get(id);
      return e && !e.deletedAt ? e : undefined;
    },
    async put(entity) {
      await table.put({ ...entity, updatedAt: new Date().toISOString() });
    },
    async remove(id) {
      const e = await table.get(id);
      if (!e || e.deletedAt) return;
      const ts = new Date().toISOString();
      await table.put({ ...e, deletedAt: ts, updatedAt: ts });
    },
    subscribe(cb) {
      const sub = liveQuery(list).subscribe({
        next: cb,
        error: (err: unknown) => console.error(err),
      });
      return () => sub.unsubscribe();
    },
  };
}
```

- [ ] **Step 6: Implementar `src/data/repos.ts` y `src/data/storage.ts`**

`src/data/repos.ts`:
```ts
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
```

`src/data/storage.ts`:
```ts
import type { CuotasDB } from "./db";

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function isStorageAvailable(db: CuotasDB): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 7: Correr los tests y el typecheck**

Run: `npx vitest run src/data && npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/data
git commit -m "feat(data): add dexie repository with soft delete and live subscribe" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: `data/backup.ts`

**Files:**
- Create: `src/data/backup.ts`
- Test: `src/data/backup.test.ts`

**Interfaces:**
- Consumes: `createDb`, `CuotasDB`, `SCHEMA_VERSION`, `getMeta`, `setLastBackupAt`, `Meta` (Task 9); esquemas (Task 4); `todayIso` (Task 3)
- Produces:
  - `type BackupData = { cards: Card[]; purchases: Purchase[]; incomes: Income[]; fixedExpenses: FixedExpense[]; categories: BudgetCategory[] }`
  - `interface BackupFile { app: "cuotas-app"; schemaVersion: number; exportedAt: string; data: BackupData }`
  - `type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string }`
  - `exportBackup(db: CuotasDB, now?: Date): Promise<BackupFile>` (incluye borrados lógicos; actualiza `lastBackupAt`)
  - `parseBackup(raw: unknown): ParseResult`, `parseBackupText(text: string): ParseResult`
  - `importBackup(db: CuotasDB, backup: BackupFile): Promise<void>` (reemplaza todo en una transacción)
  - `backupSummary(backup: BackupFile): Record<keyof BackupData, number>` (cuenta los no borrados)
  - `backupFileName(now?: Date): string`
  - `shouldRemindBackup(meta: Meta, hasData: boolean, now: Date): boolean`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeCard, makePurchase } from "../test/factories";
import {
  backupFileName, backupSummary, exportBackup, importBackup, parseBackup, parseBackupText,
  shouldRemindBackup,
} from "./backup";
import { createDb, getMeta, SCHEMA_VERSION, type CuotasDB } from "./db";

let db: CuotasDB;
let other: CuotasDB;

beforeEach(() => {
  db = createDb(`test-${crypto.randomUUID()}`);
  other = createDb(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
  await other.delete();
});

describe("exportBackup", () => {
  it("incluye todo (también borrados) y registra lastBackupAt", async () => {
    await db.cards.put(makeCard());
    await db.purchases.put(makePurchase({ deletedAt: "2026-01-02T00:00:00.000Z" }));
    const now = new Date("2026-09-30T12:00:00.000Z");
    const backup = await exportBackup(db, now);
    expect(backup.app).toBe("cuotas-app");
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION);
    expect(backup.data.cards).toHaveLength(1);
    expect(backup.data.purchases).toHaveLength(1);
    expect((await getMeta(db)).lastBackupAt).toBe(now.toISOString());
  });
});

describe("ida y vuelta", () => {
  it("importar reemplaza los datos existentes", async () => {
    const card = makeCard({ name: "Naranja" });
    await db.cards.put(card);
    await other.cards.put(makeCard({ name: "Vieja" }));
    const parsed = parseBackup(JSON.parse(JSON.stringify(await exportBackup(db))));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await importBackup(other, parsed.backup);
    const names = (await other.cards.toArray()).map((c) => c.name);
    expect(names).toEqual(["Naranja"]);
  });
});

describe("parseBackup", () => {
  const valid = {
    app: "cuotas-app",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-09-30T00:00:00.000Z",
    data: { cards: [], purchases: [], incomes: [], fixedExpenses: [], categories: [] },
  };

  it("acepta backup válido", () => {
    expect(parseBackup(valid).ok).toBe(true);
  });
  it("rechaza texto que no es JSON", () => {
    expect(parseBackupText("hola")).toEqual({ ok: false, error: "El archivo no es un JSON válido." });
  });
  it("rechaza JSON ajeno", () => {
    expect(parseBackup({ foo: 1 })).toEqual({ ok: false, error: "El archivo no es un backup de Cuotas." });
  });
  it("rechaza versión más nueva", () => {
    const r = parseBackup({ ...valid, schemaVersion: SCHEMA_VERSION + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/versión más nueva/);
  });
  it("rechaza datos inválidos", () => {
    const bad = { ...valid, data: { ...valid.data, purchases: [makePurchase({ installmentsCount: 0 })] } };
    expect(parseBackup(bad)).toEqual({ ok: false, error: "El backup tiene datos inválidos." });
  });
});

describe("backupSummary", () => {
  it("cuenta sólo registros no borrados", async () => {
    await db.cards.put(makeCard());
    await db.cards.put(makeCard({ deletedAt: "x" }));
    const summary = backupSummary(await exportBackup(db));
    expect(summary.cards).toBe(1);
    expect(summary.purchases).toBe(0);
  });
});

describe("backupFileName", () => {
  it("usa la fecha local", () => {
    expect(backupFileName(new Date(2026, 8, 30))).toBe("cuotas-backup-2026-09-30.json");
  });
});

describe("shouldRemindBackup", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  it("no recuerda sin datos", () => {
    expect(shouldRemindBackup({ key: "meta", schemaVersion: 1 }, false, now)).toBe(false);
  });
  it("recuerda si nunca hubo backup", () => {
    expect(shouldRemindBackup({ key: "meta", schemaVersion: 1 }, true, now)).toBe(true);
  });
  it("recuerda pasados 30 días", () => {
    const meta = { key: "meta" as const, schemaVersion: 1 };
    expect(shouldRemindBackup({ ...meta, lastBackupAt: "2026-08-15T00:00:00.000Z" }, true, now)).toBe(true);
    expect(shouldRemindBackup({ ...meta, lastBackupAt: "2026-09-10T00:00:00.000Z" }, true, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/data/backup.test.ts`
Expected: FAIL, no se puede resolver `./backup`.

- [ ] **Step 3: Implementar**

```ts
import { z } from "zod";
import { todayIso } from "../domain/month";
import {
  budgetCategorySchema, cardSchema, fixedExpenseSchema, incomeSchema, purchaseSchema,
} from "../domain/schemas";
import { SCHEMA_VERSION, setLastBackupAt, type CuotasDB, type Meta } from "./db";

const backupDataSchema = z.object({
  cards: z.array(cardSchema),
  purchases: z.array(purchaseSchema),
  incomes: z.array(incomeSchema),
  fixedExpenses: z.array(fixedExpenseSchema),
  categories: z.array(budgetCategorySchema),
});
export type BackupData = z.infer<typeof backupDataSchema>;

const envelopeSchema = z.object({
  app: z.literal("cuotas-app"),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.unknown(),
});

export interface BackupFile {
  app: "cuotas-app";
  schemaVersion: number;
  exportedAt: string;
  data: BackupData;
}

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

/** MIGRATIONS[n] transforma los datos de la versión n a la n + 1. */
const MIGRATIONS: Record<number, (data: unknown) => unknown> = {};

export function parseBackup(raw: unknown): ParseResult {
  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success) return { ok: false, error: "El archivo no es un backup de Cuotas." };
  const { schemaVersion, exportedAt } = envelope.data;
  if (schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: "Backup de una versión más nueva de la app. Actualizá la app e intentá de nuevo.",
    };
  }
  let data = envelope.data.data;
  for (let v = schemaVersion; v < SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, error: `No se puede migrar desde la versión ${v}.` };
    data = migrate(data);
  }
  const parsed = backupDataSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "El backup tiene datos inválidos." };
  return {
    ok: true,
    backup: { app: "cuotas-app", schemaVersion: SCHEMA_VERSION, exportedAt, data: parsed.data },
  };
}

export function parseBackupText(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
  return parseBackup(raw);
}

export async function exportBackup(db: CuotasDB, now: Date = new Date()): Promise<BackupFile> {
  const data: BackupData = {
    cards: await db.cards.toArray(),
    purchases: await db.purchases.toArray(),
    incomes: await db.incomes.toArray(),
    fixedExpenses: await db.fixedExpenses.toArray(),
    categories: await db.categories.toArray(),
  };
  await setLastBackupAt(db, now.toISOString());
  return { app: "cuotas-app", schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data };
}

export async function importBackup(db: CuotasDB, backup: BackupFile): Promise<void> {
  const { data } = backup;
  await db.transaction(
    "rw",
    [db.cards, db.purchases, db.incomes, db.fixedExpenses, db.categories],
    async () => {
      await Promise.all([
        db.cards.clear(),
        db.purchases.clear(),
        db.incomes.clear(),
        db.fixedExpenses.clear(),
        db.categories.clear(),
      ]);
      await db.cards.bulkPut(data.cards);
      await db.purchases.bulkPut(data.purchases);
      await db.incomes.bulkPut(data.incomes);
      await db.fixedExpenses.bulkPut(data.fixedExpenses);
      await db.categories.bulkPut(data.categories);
    },
  );
}

export function backupSummary(backup: BackupFile): Record<keyof BackupData, number> {
  const live = (rows: { deletedAt?: string }[]) => rows.filter((r) => !r.deletedAt).length;
  const { data } = backup;
  return {
    cards: live(data.cards),
    purchases: live(data.purchases),
    incomes: live(data.incomes),
    fixedExpenses: live(data.fixedExpenses),
    categories: live(data.categories),
  };
}

export function backupFileName(now: Date = new Date()): string {
  return `cuotas-backup-${todayIso(now)}.json`;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldRemindBackup(meta: Meta, hasData: boolean, now: Date): boolean {
  if (!hasData) return false;
  if (!meta.lastBackupAt) return true;
  return now.getTime() - Date.parse(meta.lastBackupAt) > THIRTY_DAYS_MS;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/data/backup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/backup.ts src/data/backup.test.ts
git commit -m "feat(data): add versioned json backup export/import" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: App shell (providers, hooks, layout, rutas, error boundary)

**Files:**
- Create: `src/app/context.ts`, `src/app/RepoProvider.tsx`, `src/app/hooks.ts`, `src/app/Layout.tsx`, `src/app/StorageBanner.tsx`, `src/app/ErrorBoundary.tsx`, `src/routes.tsx`, `src/App.tsx`, `src/ui/styles.ts`, `src/ui/Field.tsx`, `src/ui/Panel.tsx`, `src/ui/ConfirmButton.tsx`, `src/ui/formErrors.ts`, `src/ui/download.ts`, `src/test/render.tsx`
- Create (páginas stub, se reemplazan en tareas siguientes): `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/MonthDetailPage.tsx`, `src/features/purchases/PurchasesPage.tsx`, `src/features/purchases/PurchaseFormPage.tsx`, `src/features/budget/BudgetPage.tsx`, `src/features/settings/SettingsPage.tsx`
- Modify: `src/main.tsx`
- Test: `src/app/Layout.test.tsx`, `src/app/ErrorBoundary.test.tsx`

**Interfaces:**
- Consumes: `CuotasDB`, `createDb`, `Repos`, `createRepos`, `Repository`, `getMeta`, `Meta`, `isStorageAvailable`, `requestPersistence` (Task 9); `exportBackup`, `backupFileName` (Task 10); `BudgetData` (Task 7); `currentMonth`, `todayIso` (Task 3)
- Produces:
  - `RepoProvider({ db, children })`; `useAppData(): { db: CuotasDB; repos: Repos }`
  - Hooks: `useCards()`, `usePurchases()`, `useIncomes()`, `useFixedExpenses()`, `useCategories()` (cada uno `T[] | undefined` mientras carga), `useBudgetData(): BudgetData | undefined`, `useToday(): { today: string; month: Month }`, `useMeta(): Meta | undefined`
  - `AppRoutes` (rutas: `/`, `/mes/:month`, `/compras`, `/compras/nueva`, `/compras/:id`, `/presupuesto`, `/ajustes`)
  - UI: `inputClass`, `buttonClass`, `secondaryButtonClass`, `dangerButtonClass`; `Field({ id, label, error?, hint?, children })`; `Panel({ title?, actions?, children })` (`<section>` con `aria-labelledby`); `ConfirmButton({ label, onConfirm, className?, confirmLabel? })`; `fieldErrors(error: ZodError): Record<string, string>`; `downloadJson(filename: string, data: unknown): void`
  - Test helper: `renderApp(ui, { route?, db? }) → RenderResult & { db, repos }`

- [ ] **Step 1: Escribir los tests que fallan**

`src/app/Layout.test.tsx`:
```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../routes";
import { renderApp } from "../test/render";

describe("Layout", () => {
  it("muestra navegación inferior", () => {
    renderApp(<AppRoutes />);
    for (const name of ["Inicio", "Compras", "Presupuesto", "Ajustes"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("muestra botón de nueva compra en Inicio y no en Ajustes", () => {
    const { unmount } = renderApp(<AppRoutes />);
    expect(screen.getByRole("link", { name: "Nueva compra" })).toBeInTheDocument();
    unmount();
    renderApp(<AppRoutes />, { route: "/ajustes" });
    expect(screen.queryByRole("link", { name: "Nueva compra" })).toBeNull();
  });

  it("no muestra aviso de almacenamiento si IndexedDB funciona", async () => {
    renderApp(<AppRoutes />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/No se pueden guardar datos/)).toBeNull();
  });
});
```

`src/app/ErrorBoundary.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDb } from "../data/db";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("muestra pantalla de error con acciones", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary db={createDb(`test-${crypto.randomUUID()}`)}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar backup" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run src/app`
Expected: FAIL, no se pueden resolver los módulos.

- [ ] **Step 3: Implementar el contexto, el provider y los hooks**

`src/app/context.ts`:
```ts
import { createContext } from "react";
import type { CuotasDB } from "../data/db";
import type { Repos } from "../data/repos";

export interface AppData {
  db: CuotasDB;
  repos: Repos;
}

export const AppDataContext = createContext<AppData | null>(null);
```

`src/app/RepoProvider.tsx`:
```tsx
import { useMemo, type ReactNode } from "react";
import type { CuotasDB } from "../data/db";
import { createRepos } from "../data/repos";
import { AppDataContext } from "./context";

export function RepoProvider({ db, children }: { db: CuotasDB; children: ReactNode }) {
  const value = useMemo(() => ({ db, repos: createRepos(db) }), [db]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
```

`src/app/hooks.ts`:
```ts
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
```

- [ ] **Step 4: Implementar los componentes de UI compartidos**

`src/ui/styles.ts`:
```ts
export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-600 dark:bg-slate-800";
export const buttonClass =
  "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white active:bg-indigo-700 disabled:opacity-50";
export const secondaryButtonClass =
  "rounded-lg border border-slate-300 px-4 py-2 font-medium dark:border-slate-600";
export const dangerButtonClass = "rounded-lg border border-red-500 px-4 py-2 font-medium text-red-600";
export const smallButtonClass = "rounded-md px-2 py-1 text-sm text-indigo-600 dark:text-indigo-400";
```

`src/ui/Field.tsx`:
```tsx
import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

`src/ui/Panel.tsx`:
```tsx
import { useId, type ReactNode } from "react";

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, actions, children }: PanelProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
```

`src/ui/ConfirmButton.tsx`:
```tsx
import { useState } from "react";

interface ConfirmButtonProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  confirmLabel?: string;
}

/** Botón de dos toques: evita confirm(), que no funciona bien en todos los contextos. */
export function ConfirmButton({
  label,
  onConfirm,
  className,
  confirmLabel = "¿Seguro? Tocá de nuevo",
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          void onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
```

`src/ui/formErrors.ts`:
```ts
import type { ZodError } from "zod";

export function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
```

`src/ui/download.ts`:
```ts
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Implementar el layout, el banner, el error boundary y las rutas**

`src/app/StorageBanner.tsx`:
```tsx
import { useEffect, useState } from "react";
import { isStorageAvailable } from "../data/storage";
import { useAppData } from "./hooks";

export function StorageBanner() {
  const { db } = useAppData();
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let alive = true;
    void isStorageAvailable(db).then((available) => {
      if (alive) setOk(available);
    });
    return () => {
      alive = false;
    };
  }, [db]);
  if (ok) return null;
  return (
    <div role="alert" className="bg-red-600 px-4 py-2 text-sm text-white">
      No se pueden guardar datos en este navegador (¿modo incógnito?).
    </div>
  );
}
```

`src/app/Layout.tsx`:
```tsx
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { StorageBanner } from "./StorageBanner";

const tabs = [
  { to: "/", label: "Inicio", end: true },
  { to: "/compras", label: "Compras", end: false },
  { to: "/presupuesto", label: "Presupuesto", end: false },
  { to: "/ajustes", label: "Ajustes", end: false },
];

export function Layout() {
  const { pathname } = useLocation();
  const showFab = pathname === "/" || pathname === "/compras";
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <StorageBanner />
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-28">
        <Outlet />
      </main>
      {showFab && (
        <Link
          to="/compras/nueva"
          aria-label="Nueva compra"
          className="fixed right-4 bottom-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg"
        >
          +
        </Link>
      )}
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
        <ul className="mx-auto flex max-w-2xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `block py-3 text-center text-sm ${isActive ? "font-semibold text-indigo-600" : "text-slate-500"}`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
```

`src/app/ErrorBoundary.tsx`:
```tsx
import { Component, type ReactNode } from "react";
import { backupFileName, exportBackup } from "../data/backup";
import type { CuotasDB } from "../data/db";
import { downloadJson } from "../ui/download";
import { buttonClass, secondaryButtonClass } from "../ui/styles";

interface Props {
  db: CuotasDB;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  private handleExport = async () => {
    downloadJson(backupFileName(), await exportBackup(this.props.db));
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-xl font-bold">Algo salió mal</h1>
        <p className="text-sm text-slate-500">Tus datos siguen guardados en el teléfono.</p>
        <div className="flex justify-center gap-2">
          <button type="button" className={buttonClass} onClick={() => location.reload()}>
            Recargar
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => void this.handleExport()}>
            Exportar backup
          </button>
        </div>
      </div>
    );
  }
}
```

Páginas stub (una por archivo, se reemplazan en tareas siguientes):
```tsx
// src/features/dashboard/DashboardPage.tsx
export function DashboardPage() {
  return <h1 className="text-xl font-bold">Inicio</h1>;
}
```
```tsx
// src/features/dashboard/MonthDetailPage.tsx
export function MonthDetailPage() {
  return <h1 className="text-xl font-bold">Mes</h1>;
}
```
```tsx
// src/features/purchases/PurchasesPage.tsx
export function PurchasesPage() {
  return <h1 className="text-xl font-bold">Compras</h1>;
}
```
```tsx
// src/features/purchases/PurchaseFormPage.tsx
export function PurchaseFormPage() {
  return <h1 className="text-xl font-bold">Nueva compra</h1>;
}
```
```tsx
// src/features/budget/BudgetPage.tsx
export function BudgetPage() {
  return <h1 className="text-xl font-bold">Presupuesto</h1>;
}
```
```tsx
// src/features/settings/SettingsPage.tsx
export function SettingsPage() {
  return <h1 className="text-xl font-bold">Ajustes</h1>;
}
```

`src/routes.tsx`:
```tsx
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
```

`src/App.tsx`:
```tsx
import { HashRouter } from "react-router";
import { AppRoutes } from "./routes";

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { RepoProvider } from "./app/RepoProvider";
import { createDb } from "./data/db";
import { requestPersistence } from "./data/storage";
import "./index.css";

const db = createDb();
void requestPersistence();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary db={db}>
      <RepoProvider db={db}>
        <App />
      </RepoProvider>
    </ErrorBoundary>
  </StrictMode>,
);
```

`src/test/render.tsx`:
```tsx
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { RepoProvider } from "../app/RepoProvider";
import { createDb, type CuotasDB } from "../data/db";
import { createRepos } from "../data/repos";

export function renderApp(
  ui: ReactElement,
  { route = "/", db = createDb(`test-${crypto.randomUUID()}`) }: { route?: string; db?: CuotasDB } = {},
) {
  const result = render(
    <RepoProvider db={db}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </RepoProvider>,
  );
  return { ...result, db, repos: createRepos(db) };
}
```

- [ ] **Step 6: Correr todos los chequeos**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: todo PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(app): add shell with providers, hooks, layout, routes and error boundary" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Ajustes: tarjetas

**Files:**
- Create: `src/features/settings/CardForm.tsx`, `src/features/settings/CardsSection.tsx`
- Modify: `src/features/settings/SettingsPage.tsx` (reemplazo completo)
- Test: `src/features/settings/CardsSection.test.tsx`

**Interfaces:**
- Consumes: `useAppData`, `useCards`, `usePurchases`, `useToday` (Task 11); `newEntity` (Task 9); `cardInputSchema`, `Card`, `CardInput` (Task 4); `isFinished` (Task 5); `Field`, `Panel`, `ConfirmButton`, `fieldErrors`, estilos (Task 11)
- Produces: `CardsSection()`; `SettingsPage()` renderiza `<CardsSection />`. La Task 17 agrega `<BackupSection />` y la versión.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/render";
import { makeCard, makePurchase } from "../../test/factories";
import { CardsSection } from "./CardsSection";

describe("CardsSection", () => {
  it("agrega una tarjeta", async () => {
    const user = userEvent.setup();
    renderApp(<CardsSection />);
    await user.click(await screen.findByRole("button", { name: "Agregar tarjeta" }));
    await user.type(screen.getByLabelText("Nombre"), "Visa Galicia");
    await user.type(screen.getByLabelText("Día de cierre"), "25");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Visa Galicia")).toBeInTheDocument();
    expect(screen.getByText(/cierra día 25/)).toBeInTheDocument();
  });

  it("valida nombre obligatorio y día fuera de rango", async () => {
    const user = userEvent.setup();
    renderApp(<CardsSection />);
    await user.click(await screen.findByRole("button", { name: "Agregar tarjeta" }));
    await user.type(screen.getByLabelText("Día de cierre"), "40");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Obligatorio")).toBeInTheDocument();
    expect(screen.getByText("Entre 1 y 31")).toBeInTheDocument();
  });

  it("bloquea borrar con cuotas pendientes y permite archivar", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<CardsSection />);
    const card = makeCard({ name: "Master" });
    await repos.cards.put(card);
    await repos.purchases.put(makePurchase({ cardId: card.id, firstMonth: "2099-01" }));
    await user.click(await screen.findByRole("button", { name: "Borrar" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    expect(await screen.findByText(/tiene cuotas pendientes/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archivar tarjeta" }));
    expect(await screen.findByText("archivada")).toBeInTheDocument();
  });

  it("borrar tarjeta y sus compras no deja cuotas huérfanas", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<CardsSection />);
    const card = makeCard({ name: "Amex" });
    await repos.cards.put(card);
    await repos.purchases.put(makePurchase({ cardId: card.id, firstMonth: "2099-01" }));
    await user.click(await screen.findByRole("button", { name: "Borrar" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    await user.click(await screen.findByRole("button", { name: "Borrar tarjeta y sus compras" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    await waitFor(async () => {
      expect(await repos.cards.list()).toEqual([]);
      expect(await repos.purchases.list()).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/settings`
Expected: FAIL, no se puede resolver `./CardsSection`.

- [ ] **Step 3: Implementar `CardForm.tsx`**

```tsx
import { useId, useState, type FormEvent } from "react";
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

  async function handleSubmit(e: FormEvent) {
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
    await onSubmit(result.data);
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
        <button type="submit" className={buttonClass}>Guardar</button>
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Implementar `CardsSection.tsx`**

```tsx
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
```

- [ ] **Step 5: Reemplazar `SettingsPage.tsx`**

```tsx
import { CardsSection } from "./CardsSection";

export function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Ajustes</h1>
      <CardsSection />
    </>
  );
}
```

- [ ] **Step 6: Correr los tests y los chequeos**

Run: `npx vitest run src/features/settings && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/settings
git commit -m "feat(settings): manage cards with safe delete and archive" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Formulario de compra + vista previa "¿me alcanza?"

**Files:**
- Create: `src/features/purchases/PurchaseForm.tsx`, `src/features/purchases/PurchasePreview.tsx`
- Modify: `src/features/purchases/PurchaseFormPage.tsx` (reemplazo completo)
- Test: `src/features/purchases/PurchaseForm.test.tsx`

**Interfaces:**
- Consumes: `useAppData`, `useCards`, `useBudgetData`, `usePurchases`, `useToday` (Task 11); `newEntity` (Task 9); `purchaseInputSchema`, `Purchase` (Task 4); `suggestFirstMonth`, `defaultFirstMonth` (Task 6); `previewPurchase`, `PreviewRow` (Task 8); `parseMoneyInput`, `formatMoney`, `formatMoneyInput`, `divideEvenly`, `CURRENCIES`, `Currency` (Task 2); `formatMonth` (Task 3)
- Produces: `PurchaseForm({ initial?: Purchase; onSaved: () => void })`, `PurchasePreview({ rows: PreviewRow[]; currency: Currency })`, `PurchaseFormPage()` (rutas `/compras/nueva` y `/compras/:id`)

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { PurchaseForm } from "./PurchaseForm";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

async function setup(onSaved = vi.fn()) {
  const user = userEvent.setup();
  const r = renderApp(<PurchaseForm onSaved={onSaved} />);
  await r.repos.cards.put(makeCard({ id: "visa", name: "Visa", closingDay: 25 }));
  await screen.findByRole("option", { name: "Visa" });
  return { user, onSaved, ...r };
}

describe("PurchaseForm", () => {
  it("sugiere el mes de la primera cuota según el cierre", async () => {
    await setup();
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-10");
    expect(screen.getByText("Sugerido según el cierre de la tarjeta")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fecha de compra"), { target: { value: "2026-09-26" } });
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-11");
  });

  it("el mes editado a mano prevalece", async () => {
    await setup();
    fireEvent.change(screen.getByLabelText("Mes de la 1ra cuota"), { target: { value: "2026-12" } });
    fireEvent.change(screen.getByLabelText("Fecha de compra"), { target: { value: "2026-09-26" } });
    expect(screen.getByLabelText("Mes de la 1ra cuota")).toHaveValue("2026-12");
  });

  it("carga por total y guarda el valor de la cuota", async () => {
    const { user, onSaved, repos } = await setup();
    await user.type(screen.getByLabelText("Descripción"), "Heladera");
    await user.clear(screen.getByLabelText("Cantidad de cuotas"));
    await user.type(screen.getByLabelText("Cantidad de cuotas"), "12");
    await user.selectOptions(screen.getByLabelText("Cargar como"), "total");
    await user.type(screen.getByLabelText("Monto total"), "120.000");
    expect(screen.getByText(/12 cuotas de .*10\.000,00/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar compra" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [saved] = await repos.purchases.list();
    expect(saved).toMatchObject({
      cardId: "visa",
      description: "Heladera",
      installmentsCount: 12,
      installmentAmount: 1000000,
      firstMonth: "2026-10",
      purchaseDate: "2026-09-10",
    });
  });

  it("muestra Monto inválido y no guarda", async () => {
    const { user, onSaved, repos } = await setup();
    await user.type(screen.getByLabelText("Descripción"), "Algo");
    await user.type(screen.getByLabelText("Valor de la cuota"), "abc");
    await user.click(screen.getByRole("button", { name: "Guardar compra" }));
    expect(await screen.findByText("Monto inválido")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(await repos.purchases.list()).toEqual([]);
  });

  it("vista previa avisa meses en negativo", async () => {
    const { user, repos } = await setup();
    await repos.incomes.put(makeIncome({ amount: 500000, startMonth: "2026-01" }));
    await user.type(screen.getByLabelText("Descripción"), "Tele");
    await user.type(screen.getByLabelText("Valor de la cuota"), "10.000");
    expect(await screen.findByText(/1 mes queda en negativo/)).toBeInTheDocument();
  });

  it("edición no duplica la compra original en la vista previa", async () => {
    const user = userEvent.setup();
    const original = makePurchase({ id: "p1", cardId: "visa", firstMonth: "2026-10", installmentsCount: 1, installmentAmount: 100000 });
    const r = renderApp(<PurchaseForm initial={original} onSaved={vi.fn()} />);
    await r.repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await r.repos.incomes.put(makeIncome({ amount: 300000 }));
    await r.repos.purchases.put(original);
    await screen.findByRole("option", { name: "Visa" });
    expect(await screen.findByText(/Todos los meses quedan en positivo/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Valor de la cuota"));
    await user.type(screen.getByLabelText("Valor de la cuota"), "2500");
    expect(await screen.findByText(/Todos los meses quedan en positivo/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/purchases/PurchaseForm.test.tsx`
Expected: FAIL, no se puede resolver `./PurchaseForm`.

- [ ] **Step 3: Implementar `PurchasePreview.tsx`**

```tsx
import type { Currency } from "../../domain/money";
import { formatMoney } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { PreviewRow } from "../../domain/projection";
import { Panel } from "../../ui/Panel";

export function PurchasePreview({ rows, currency }: { rows: PreviewRow[]; currency: Currency }) {
  if (rows.length === 0) return null;
  const negatives = rows.filter((r) => r.after < 0).length;
  return (
    <Panel title="¿Me alcanza?">
      {negatives > 0 ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          Atención: {negatives} {negatives === 1 ? "mes queda" : "meses quedan"} en negativo.
        </p>
      ) : (
        <p className="text-sm text-green-700 dark:text-green-400">Todos los meses quedan en positivo.</p>
      )}
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="text-left font-normal">Mes</th>
              <th className="text-right font-normal">Antes</th>
              <th className="text-right font-normal">Después</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td className="capitalize">{formatMonth(r.month)}</td>
                <td className="text-right">{formatMoney(r.before, currency)}</td>
                <td className={`text-right ${r.after < 0 ? "font-semibold text-red-600" : ""}`}>
                  {formatMoney(r.after, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 4: Implementar `PurchaseForm.tsx`**

```tsx
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
  const { today } = useToday();

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
  const preview = draft ? previewPurchase(data, draft) : [];

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
```

- [ ] **Step 5: Reemplazar `PurchaseFormPage.tsx`**

```tsx
import { useNavigate, useParams } from "react-router";
import { useAppData, usePurchases } from "../../app/hooks";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { dangerButtonClass } from "../../ui/styles";
import { PurchaseForm } from "./PurchaseForm";

export function PurchaseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchases = usePurchases();
  const { repos } = useAppData();

  if (id && !purchases) return <p>Cargando…</p>;
  const initial = id ? purchases?.find((p) => p.id === id) : undefined;
  if (id && !initial) return <p>No se encontró la compra.</p>;

  return (
    <>
      <h1 className="text-xl font-bold">{initial ? "Editar compra" : "Nueva compra"}</h1>
      <PurchaseForm key={initial?.id ?? "new"} initial={initial} onSaved={() => navigate("/compras")} />
      {initial && (
        <ConfirmButton
          label="Eliminar compra"
          className={`${dangerButtonClass} w-full`}
          onConfirm={async () => {
            await repos.purchases.remove(initial.id);
            navigate("/compras");
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6: Correr los tests y los chequeos**

Run: `npx vitest run src/features/purchases && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/purchases
git commit -m "feat(purchases): add purchase form with closing suggestion and affordability preview" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Lista de compras + Gantt

**Files:**
- Create: `src/features/purchases/PurchaseList.tsx`, `src/features/purchases/GanttChart.tsx`
- Modify: `src/features/purchases/PurchasesPage.tsx` (reemplazo completo)
- Test: `src/features/purchases/PurchasesPage.test.tsx`

**Interfaces:**
- Consumes: `useCards`, `usePurchases`, `useToday` (Task 11); `installmentNumberIn`, `isFinished`, `lastMonth`, `paidCount`, `remainingAmount` (Task 5); `formatMoney` (Task 2); `formatMonth`, `monthDiff`, `monthRange` (Task 3); `Panel` (Task 11)
- Produces: `PurchaseList({ purchases, cards, current })`, `GanttChart({ purchases, cards, from })` (barras con `data-testid="gantt-bar-{id}"`, `data-start` y `data-end` = columnas de grid), `PurchasesPage()`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { PurchasesPage } from "./PurchasesPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

async function seed() {
  const r = renderApp(<PurchasesPage />);
  await r.repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
  await r.repos.purchases.put(makePurchase({ id: "tv", cardId: "visa", description: "Tele", firstMonth: "2026-08", installmentsCount: 6 }));
  await r.repos.purchases.put(makePurchase({ id: "old", cardId: "visa", description: "Zapatillas", firstMonth: "2026-01", installmentsCount: 3 }));
  await r.repos.purchases.put(makePurchase({ id: "fut", cardId: "visa", description: "Viaje", firstMonth: "2026-11", installmentsCount: 3 }));
  await screen.findByText("Tele");
  return r;
}

describe("PurchasesPage", () => {
  it("por defecto muestra activas con número de cuota", async () => {
    await seed();
    expect(screen.getByText("Cuota 2/6")).toBeInTheDocument();
    expect(screen.getByText(/Empieza/)).toBeInTheDocument();
    expect(screen.queryByText("Zapatillas")).toBeNull();
  });

  it("filtra terminadas", async () => {
    const user = userEvent.setup();
    await seed();
    await user.click(screen.getByRole("button", { name: "Terminadas" }));
    expect(screen.getByText("Zapatillas")).toBeInTheDocument();
    expect(screen.queryByText("Tele")).toBeNull();
  });

  it("vista Gantt ubica barras por mes", async () => {
    const user = userEvent.setup();
    await seed();
    await user.click(screen.getByRole("button", { name: "Gantt" }));
    // from = 2026-09. Tele (2026-08..2027-01) se recorta a 2026-09..2027-01 → columnas 2 a 7.
    const tv = screen.getByTestId("gantt-bar-tv");
    expect(tv.dataset.start).toBe("2");
    expect(tv.dataset.end).toBe("7");
    // Viaje (2026-11..2027-01) → columnas 4 a 7.
    const fut = screen.getByTestId("gantt-bar-fut");
    expect(fut.dataset.start).toBe("4");
    expect(fut.dataset.end).toBe("7");
    expect(screen.queryByTestId("gantt-bar-old")).toBeNull();
    expect(within(screen.getByTestId("gantt")).getByText("Tele")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/purchases/PurchasesPage.test.tsx`
Expected: FAIL, no aparece "Tele" porque la página todavía es un stub.

- [ ] **Step 3: Implementar `PurchaseList.tsx`**

```tsx
import { Link } from "react-router";
import {
  installmentNumberIn, isFinished, paidCount, remainingAmount,
} from "../../domain/installments";
import { formatMoney } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import type { Card, Purchase } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";

interface Props {
  purchases: Purchase[];
  cards: Card[];
  current: Month;
}

export function PurchaseList({ purchases, cards, current }: Props) {
  if (purchases.length === 0) {
    return <p className="text-sm text-slate-500">No hay compras para mostrar.</p>;
  }
  const groups = cards
    .map((card) => ({ card, items: purchases.filter((p) => p.cardId === card.id) }))
    .filter((g) => g.items.length > 0);
  return (
    <>
      {groups.map(({ card, items }) => (
        <Panel key={card.id} title={card.name}>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((p) => (
              <PurchaseItem key={p.id} purchase={p} color={card.color} current={current} />
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}

function PurchaseItem({ purchase: p, color, current }: { purchase: Purchase; color: string; current: Month }) {
  const n = installmentNumberIn(p, current);
  const status = isFinished(p, current)
    ? "Terminada"
    : n !== null
      ? `Cuota ${n}/${p.installmentsCount}`
      : `Empieza ${formatMonth(p.firstMonth)}`;
  const progress = (paidCount(p, current) / p.installmentsCount) * 100;
  return (
    <li>
      <Link to={`/compras/${p.id}`} className="block space-y-1 py-2">
        <div className="flex justify-between gap-2">
          <span>{p.description}</span>
          <span className="font-medium">{formatMoney(p.installmentAmount, p.currency)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{status}</span>
          <span>Resta {formatMoney(remainingAmount(p, current), p.currency)}</span>
        </div>
        <div className="h-1.5 rounded bg-slate-200 dark:bg-slate-700">
          <div className="h-1.5 rounded" style={{ width: `${progress}%`, background: color }} />
        </div>
      </Link>
    </li>
  );
}
```

- [ ] **Step 4: Implementar `GanttChart.tsx`**

```tsx
import { Fragment } from "react";
import { lastMonth } from "../../domain/installments";
import { formatMonth, monthDiff, monthRange, type Month } from "../../domain/month";
import type { Card, Purchase } from "../../domain/schemas";

const MAX_COLUMNS = 24;

interface Props {
  purchases: Purchase[];
  cards: Card[];
  from: Month;
}

export function GanttChart({ purchases, cards, from }: Props) {
  if (purchases.length === 0) {
    return <p className="text-sm text-slate-500">No hay compras activas.</p>;
  }
  const colorOf = new Map(cards.map((c) => [c.id, c.color]));
  const end = purchases.map(lastMonth).reduce((a, b) => (a > b ? a : b));
  const columns = Math.max(1, Math.min(MAX_COLUMNS, monthDiff(from, end) + 1));
  const months = monthRange(from, columns);
  const lastVisible = months[months.length - 1];
  const rows = [...purchases].sort(
    (a, b) => a.firstMonth.localeCompare(b.firstMonth) || lastMonth(a).localeCompare(lastMonth(b)),
  );

  return (
    <div data-testid="gantt" className="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
      <div
        className="grid gap-y-1 text-xs"
        style={{ gridTemplateColumns: `8rem repeat(${columns}, 2.75rem)` }}
      >
        <div style={{ gridRow: 1, gridColumn: 1 }} />
        {months.map((m, i) => (
          <div key={m} className="text-center text-slate-500 capitalize" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {formatMonth(m)}
          </div>
        ))}
        {rows.map((p, i) => {
          const start = p.firstMonth > from ? p.firstMonth : from;
          const last = lastMonth(p);
          const stop = last < lastVisible ? last : lastVisible;
          const colStart = monthDiff(from, start) + 2;
          const colEnd = monthDiff(from, stop) + 3;
          return (
            <Fragment key={p.id}>
              <div className="truncate pr-2" style={{ gridRow: i + 2, gridColumn: 1 }}>
                {p.description}
              </div>
              <div
                data-testid={`gantt-bar-${p.id}`}
                data-start={colStart}
                data-end={colEnd}
                title={`${p.description}: ${formatMonth(p.firstMonth)} – ${formatMonth(last)}`}
                className="h-5 rounded"
                style={{
                  gridRow: i + 2,
                  gridColumn: `${colStart} / ${colEnd}`,
                  background: colorOf.get(p.cardId) ?? "#94a3b8",
                }}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Reemplazar `PurchasesPage.tsx`**

```tsx
import { useState } from "react";
import { useCards, usePurchases, useToday } from "../../app/hooks";
import { isFinished } from "../../domain/installments";
import { GanttChart } from "./GanttChart";
import { PurchaseList } from "./PurchaseList";

type Filter = "active" | "finished" | "all";
type View = "list" | "gantt";

const filters: { value: Filter; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "finished", label: "Terminadas" },
  { value: "all", label: "Todas" },
];

const pill = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`;

export function PurchasesPage() {
  const purchases = usePurchases();
  const cards = useCards();
  const { month } = useToday();
  const [filter, setFilter] = useState<Filter>("active");
  const [view, setView] = useState<View>("list");

  if (!purchases || !cards) return <p>Cargando…</p>;

  const active = purchases.filter((p) => !isFinished(p, month));
  const visible = purchases
    .filter((p) => (filter === "all" ? true : filter === "active" ? !isFinished(p, month) : isFinished(p, month)))
    .sort((a, b) => a.firstMonth.localeCompare(b.firstMonth));

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Compras</h1>
        <div className="flex gap-1" role="group" aria-label="Vista">
          <button type="button" aria-pressed={view === "list"} className={pill(view === "list")} onClick={() => setView("list")}>Lista</button>
          <button type="button" aria-pressed={view === "gantt"} className={pill(view === "gantt")} onClick={() => setView("gantt")}>Gantt</button>
        </div>
      </div>
      {view === "list" ? (
        <>
          <div className="flex gap-2" role="group" aria-label="Filtro">
            {filters.map((f) => (
              <button key={f.value} type="button" aria-pressed={filter === f.value} className={pill(filter === f.value)} onClick={() => setFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <PurchaseList purchases={visible} cards={cards} current={month} />
        </>
      ) : (
        <GanttChart purchases={active} cards={cards} from={month} />
      )}
    </>
  );
}
```

- [ ] **Step 6: Correr los tests y los chequeos**

Run: `npx vitest run src/features/purchases && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/purchases
git commit -m "feat(purchases): add purchase list with filters and gantt view" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Dashboard (Inicio) + detalle del mes

**Files:**
- Create: `src/features/dashboard/MonthNav.tsx`, `src/features/dashboard/AvailableHero.tsx`, `src/features/dashboard/ProjectionChart.tsx`, `src/features/dashboard/MonthTable.tsx`, `src/features/dashboard/CardSummaryList.tsx`, `src/features/dashboard/EmptyState.tsx`, `src/ui/BreakdownTable.tsx`, `src/ui/AmountList.tsx`
- Modify: `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/MonthDetailPage.tsx` (reemplazo completo)
- Test: `src/features/dashboard/DashboardPage.test.tsx`, `src/features/dashboard/MonthDetailPage.test.tsx`

**Interfaces:**
- Consumes: `useBudgetData`, `useCards`, `useToday` (Task 11); `project`, `cardSummaries`, `MonthProjection`, `CardSummary` (Task 8); `monthBreakdown`, `appliesIn`, `emptyBreakdown`, `ByCurrency`, `MonthBreakdown` (Task 7); `installmentsInMonth` (Task 5); `CURRENCIES`, `formatMoney` (Task 2); `addMonths`, `formatMonth`, `isMonth` (Task 3)
- Produces: `DashboardPage()`, `MonthDetailPage()`, `BreakdownTable({ breakdown, currency })`, `AmountList({ items })` (items: `{ id, label, amount, currency }[]`). Tests usan `data-testid="available-{currency}"`.

- [ ] **Step 1: Escribir los tests que fallan**

`src/features/dashboard/DashboardPage.test.tsx`:
```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCard, makeFixedExpense, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { DashboardPage } from "./DashboardPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

describe("DashboardPage", () => {
  it("sin tarjetas muestra guía inicial", async () => {
    renderApp(<DashboardPage />);
    expect(await screen.findByText("Agregá tu primera tarjeta")).toBeInTheDocument();
  });

  it("muestra disponible, resumen por tarjeta y meses", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<DashboardPage />);
    await repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await repos.incomes.put(makeIncome({ amount: 50000000 }));
    await repos.fixedExpenses.put(makeFixedExpense({ amount: 20000000 }));
    await repos.purchases.put(makePurchase({ cardId: "visa", firstMonth: "2026-09", installmentsCount: 3, installmentAmount: 1000000 }));

    expect(await screen.findByTestId("available-ARS")).toHaveTextContent(/290\.000,00/);
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText(/1 compra · última cuota/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /sept|sep/i }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(await screen.findByTestId("available-ARS")).toHaveTextContent(/290\.000,00/);
  });

  it("disponible negativo se marca en rojo", async () => {
    const { repos } = renderApp(<DashboardPage />);
    await repos.cards.put(makeCard({ id: "visa" }));
    await repos.purchases.put(makePurchase({ cardId: "visa", firstMonth: "2026-09", installmentAmount: 5000 }));
    const hero = await screen.findByTestId("available-ARS");
    expect(hero).toHaveTextContent(/-/);
    expect(hero.className).toMatch(/text-red-600/);
  });
});
```

`src/features/dashboard/MonthDetailPage.test.tsx`:
```tsx
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { makeCard, makeIncome, makePurchase } from "../../test/factories";
import { renderApp } from "../../test/render";
import { MonthDetailPage } from "./MonthDetailPage";

const ui = (
  <Routes>
    <Route path="/mes/:month" element={<MonthDetailPage />} />
  </Routes>
);

describe("MonthDetailPage", () => {
  it("lista cuotas con n/N e ingresos del mes", async () => {
    const { repos } = renderApp(ui, { route: "/mes/2026-11" });
    await repos.cards.put(makeCard({ id: "visa", name: "Visa" }));
    await repos.incomes.put(makeIncome({ name: "Sueldo" }));
    await repos.purchases.put(makePurchase({ cardId: "visa", description: "Tele", firstMonth: "2026-10", installmentsCount: 6 }));
    expect(await screen.findByText("Tele")).toBeInTheDocument();
    expect(screen.getByText(/Visa · 2\/6/)).toBeInTheDocument();
    expect(screen.getByText("Sueldo")).toBeInTheDocument();
  });

  it("mes inválido muestra mensaje", () => {
    renderApp(ui, { route: "/mes/2026-13" });
    expect(screen.getByText("Mes inválido.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run src/features/dashboard`
Expected: FAIL, las páginas todavía son stubs.

- [ ] **Step 3: Implementar los componentes de UI compartidos**

`src/ui/BreakdownTable.tsx`:
```tsx
import type { MonthBreakdown } from "../domain/budget";
import { formatMoney, type Currency } from "../domain/money";

export function BreakdownTable({ breakdown: b, currency }: { breakdown: MonthBreakdown; currency: Currency }) {
  const rows: [string, number][] = [
    ["Ingresos", b.income],
    ["Gastos fijos", -b.fixed],
    ["Cuotas", -b.installments],
    ["Presupuesto variable", -b.variable],
  ];
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td className="text-right">{formatMoney(value, currency)}</td>
          </tr>
        ))}
        <tr className="border-t border-slate-200 font-semibold dark:border-slate-700">
          <td>Disponible ({currency})</td>
          <td className={`text-right ${b.available < 0 ? "text-red-600" : "text-green-600"}`}>
            {formatMoney(b.available, currency)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

`src/ui/AmountList.tsx`:
```tsx
import { formatMoney, type Currency, type Money } from "../domain/money";

export interface AmountItem {
  id: string;
  label: string;
  detail?: string;
  amount: Money;
  currency: Currency;
}

export function AmountList({ items }: { items: AmountItem[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">Nada este mes.</p>;
  return (
    <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
      {items.map((i) => (
        <li key={i.id} className="flex justify-between gap-2 py-1">
          <span>
            <span>{i.label}</span>
            {i.detail && <span className="text-slate-500"> {i.detail}</span>}
          </span>
          <span>{formatMoney(i.amount, i.currency)}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Implementar los componentes del dashboard**

`src/features/dashboard/MonthNav.tsx`:
```tsx
import { addMonths, formatMonth, type Month } from "../../domain/month";

export function MonthNav({ month, onChange }: { month: Month; onChange: (m: Month) => void }) {
  return (
    <div className="flex items-center justify-between">
      <button type="button" aria-label="Mes anterior" className="px-3 py-1 text-xl" onClick={() => onChange(addMonths(month, -1))}>◀</button>
      <h1 className="text-lg font-bold capitalize">{formatMonth(month)}</h1>
      <button type="button" aria-label="Mes siguiente" className="px-3 py-1 text-xl" onClick={() => onChange(addMonths(month, 1))}>▶</button>
    </div>
  );
}
```

`src/features/dashboard/AvailableHero.tsx`:
```tsx
import { Link } from "react-router";
import { emptyBreakdown, type ByCurrency, type MonthBreakdown } from "../../domain/budget";
import { formatMoney, type Currency } from "../../domain/money";
import { Panel } from "../../ui/Panel";

interface Props {
  breakdown: ByCurrency<MonthBreakdown>;
  currencies: Currency[];
}

export function AvailableHero({ breakdown, currencies }: Props) {
  if (currencies.length === 0) {
    return (
      <Panel>
        <p className="text-sm">
          Todavía no hay datos para este mes. Cargá ingresos y gastos en{" "}
          <Link to="/presupuesto" className="text-indigo-600 underline">Presupuesto</Link>.
        </p>
      </Panel>
    );
  }
  return (
    <Panel title="Disponible para invertir">
      {currencies.map((c) => {
        const b = breakdown[c] ?? emptyBreakdown();
        return (
          <div key={c}>
            <p data-testid={`available-${c}`} className={`text-3xl font-bold ${b.available < 0 ? "text-red-600" : "text-green-600"}`}>
              {formatMoney(b.available, c)}
            </p>
            <p className="text-xs text-slate-500">
              Ingresos {formatMoney(b.income, c)} · Fijos {formatMoney(b.fixed, c)} · Cuotas{" "}
              {formatMoney(b.installments, c)} · Variable {formatMoney(b.variable, c)}
            </p>
          </div>
        );
      })}
    </Panel>
  );
}
```

`src/features/dashboard/ProjectionChart.tsx`:
```tsx
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney, type Currency } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { MonthProjection } from "../../domain/projection";
import type { Card } from "../../domain/schemas";

const compact = new Intl.NumberFormat("es-AR", { notation: "compact" });

interface Props {
  projection: MonthProjection[];
  cards: Card[];
  currency: Currency;
}

export function ProjectionChart({ projection, cards, currency }: Props) {
  const rows = projection.map((p) => {
    const row: Record<string, number | string> = {
      label: formatMonth(p.month),
      available: (p.breakdown[currency]?.available ?? 0) / 100,
    };
    for (const c of cards) row[c.id] = (p.byCard[currency]?.[c.id] ?? 0) / 100;
    return row;
  });
  const withData = cards.filter((c) => projection.some((p) => p.byCard[currency]?.[c.id]));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={(v) => compact.format(Number(v))} />
          <Tooltip formatter={(v) => formatMoney(Math.round(Number(v) * 100), currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {withData.map((c) => (
            <Bar key={c.id} dataKey={c.id} name={c.name} stackId="cuotas" fill={c.color} />
          ))}
          <Line dataKey="available" name="Disponible" stroke="#16a34a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

`src/features/dashboard/MonthTable.tsx`:
```tsx
import { Link } from "react-router";
import { formatMoney, type Currency } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { MonthProjection } from "../../domain/projection";

export function MonthTable({ projection, currency }: { projection: MonthProjection[]; currency: Currency }) {
  return (
    <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
      {projection.map((p) => {
        const b = p.breakdown[currency];
        const available = b?.available ?? 0;
        return (
          <li key={p.month}>
            <Link to={`/mes/${p.month}`} className="flex justify-between gap-2 py-2">
              <span className="w-20 capitalize">{formatMonth(p.month)}</span>
              <span className="flex-1 text-right text-slate-500">Cuotas {formatMoney(b?.installments ?? 0, currency)}</span>
              <span className={`w-32 text-right font-medium ${available < 0 ? "text-red-600" : ""}`}>
                {formatMoney(available, currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

`src/features/dashboard/CardSummaryList.tsx`:
```tsx
import { formatMoney } from "../../domain/money";
import { formatMonth } from "../../domain/month";
import type { CardSummary } from "../../domain/projection";
import type { Card } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";

export function CardSummaryList({ summaries, cards }: { summaries: CardSummary[]; cards: Card[] }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return (
    <Panel title="Tarjetas">
      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">No hay cuotas pendientes.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {summaries.map((s) => {
            const card = byId.get(s.cardId);
            return (
              <li key={`${s.cardId}-${s.currency}`} className="py-2">
                <div className="flex justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: card?.color }} />
                    {card?.name ?? "Tarjeta eliminada"}
                  </span>
                  <span className="font-semibold">{formatMoney(s.thisMonth, s.currency)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {s.activeCount} {s.activeCount === 1 ? "compra" : "compras"} · última cuota{" "}
                  {formatMonth(s.lastMonth)} · restan {formatMoney(s.remaining, s.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
```

`src/features/dashboard/EmptyState.tsx`:
```tsx
import { Link } from "react-router";
import { Panel } from "../../ui/Panel";

export function EmptyState() {
  return (
    <Panel title="Empecemos">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          <Link to="/ajustes" className="text-indigo-600 underline">Agregá tu primera tarjeta</Link>
        </li>
        <li>Cargá una compra con el botón +</li>
        <li>
          Completá ingresos y gastos en <Link to="/presupuesto" className="text-indigo-600 underline">Presupuesto</Link>
        </li>
      </ol>
    </Panel>
  );
}
```

- [ ] **Step 5: Reemplazar `DashboardPage.tsx` y `MonthDetailPage.tsx`**

`src/features/dashboard/DashboardPage.tsx`:
```tsx
import { useState } from "react";
import { useBudgetData, useCards, useToday } from "../../app/hooks";
import { CURRENCIES } from "../../domain/money";
import { cardSummaries, project } from "../../domain/projection";
import { Panel } from "../../ui/Panel";
import { AvailableHero } from "./AvailableHero";
import { CardSummaryList } from "./CardSummaryList";
import { EmptyState } from "./EmptyState";
import { MonthNav } from "./MonthNav";
import { MonthTable } from "./MonthTable";
import { ProjectionChart } from "./ProjectionChart";

export function DashboardPage() {
  const data = useBudgetData();
  const cards = useCards();
  const { month: current } = useToday();
  const [month, setMonth] = useState(current);

  if (!data || !cards) return <p>Cargando…</p>;
  if (cards.length === 0) return <EmptyState />;

  const projection = project(data, month, 12);
  const currencies = CURRENCIES.filter((c) => projection.some((p) => p.breakdown[c]));
  const heroCurrencies = CURRENCIES.filter((c) => projection[0].breakdown[c]);

  return (
    <>
      <MonthNav month={month} onChange={setMonth} />
      <AvailableHero breakdown={projection[0].breakdown} currencies={heroCurrencies} />
      {currencies.map((c) => (
        <Panel key={c} title={`Próximos 12 meses · ${c}`}>
          <ProjectionChart projection={projection} cards={cards} currency={c} />
          <MonthTable projection={projection} currency={c} />
        </Panel>
      ))}
      <CardSummaryList summaries={cardSummaries(data.purchases, month)} cards={cards} />
    </>
  );
}
```

`src/features/dashboard/MonthDetailPage.tsx`:
```tsx
import { Link, useParams } from "react-router";
import { useBudgetData, useCards } from "../../app/hooks";
import { appliesIn, monthBreakdown } from "../../domain/budget";
import { installmentsInMonth } from "../../domain/installments";
import { CURRENCIES } from "../../domain/money";
import { formatMonth, isMonth } from "../../domain/month";
import { AmountList } from "../../ui/AmountList";
import { BreakdownTable } from "../../ui/BreakdownTable";
import { Panel } from "../../ui/Panel";

export function MonthDetailPage() {
  const { month = "" } = useParams();
  const data = useBudgetData();
  const cards = useCards();

  if (!isMonth(month)) return <p>Mes inválido.</p>;
  if (!data || !cards) return <p>Cargando…</p>;

  const cardName = new Map(cards.map((c) => [c.id, c.name]));
  const breakdown = monthBreakdown(data, month);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Volver" className="text-xl">←</Link>
        <h1 className="text-xl font-bold capitalize">{formatMonth(month)}</h1>
      </div>
      <Panel title="Cuotas">
        <AmountList
          items={installmentsInMonth(data.purchases, month).map((i) => ({
            id: i.purchaseId,
            label: i.description,
            detail: `· ${cardName.get(i.cardId) ?? "Tarjeta eliminada"} · ${i.number}/${i.total}`,
            amount: i.amount,
            currency: i.currency,
          }))}
        />
      </Panel>
      <Panel title="Ingresos">
        <AmountList
          items={data.incomes.filter((i) => appliesIn(i, month)).map((i) => ({ id: i.id, label: i.name, amount: i.amount, currency: i.currency }))}
        />
      </Panel>
      <Panel title="Gastos fijos">
        <AmountList
          items={data.fixedExpenses.filter((f) => appliesIn(f, month)).map((f) => ({ id: f.id, label: f.name, detail: `· ${f.category}`, amount: f.amount, currency: f.currency }))}
        />
      </Panel>
      <Panel title="Presupuesto variable">
        <AmountList
          items={data.categories.map((c) => ({ id: c.id, label: c.name, amount: c.monthlyAmount, currency: c.currency }))}
        />
      </Panel>
      <Panel title="Resultado">
        {CURRENCIES.filter((c) => breakdown[c]).map((c) => (
          <BreakdownTable key={c} breakdown={breakdown[c]!} currency={c} />
        ))}
      </Panel>
    </>
  );
}
```

- [ ] **Step 6: Correr los tests y los chequeos**

Run: `npx vitest run src/features/dashboard && npm run lint && npm run typecheck`
Expected: PASS. Recharts puede avisar sobre width 0 en jsdom; es un warning, no un error.

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard src/ui
git commit -m "feat(dashboard): add home with available, 12-month projection, card summary and month detail" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Presupuesto

**Files:**
- Create: `src/features/budget/RecurringForm.tsx`, `src/features/budget/RecurringList.tsx`, `src/features/budget/IncomesSection.tsx`, `src/features/budget/FixedExpensesSection.tsx`, `src/features/budget/CategoriesSection.tsx`, `src/features/budget/BudgetTable.tsx`
- Modify: `src/features/budget/BudgetPage.tsx` (reemplazo completo)
- Test: `src/features/budget/BudgetPage.test.tsx`

**Interfaces:**
- Consumes: hooks `useAppData`, `useIncomes`, `useFixedExpenses`, `useCategories`, `useBudgetData`, `useToday` (Task 11); `newEntity` (Task 9); `incomeInputSchema`, `fixedExpenseInputSchema`, `budgetCategoryInputSchema`, tipos (Task 4); `project` (Task 8); `emptyBreakdown`, `BudgetData` (Task 7); dinero y meses (Tasks 2 y 3); `Field`, `Panel`, `ConfirmButton`, `fieldErrors`, estilos (Task 11)
- Produces: `BudgetPage()`. `RecurringValues = { name: string; amount: Money; currency: Currency; startMonth: Month; endMonth?: Month; category?: string }`. Celdas con `data-testid="budget-available-{currency}-{month}"`.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";
import { BudgetPage } from "./BudgetPage";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 10, 12));
});
afterEach(() => vi.useRealTimers());

describe("BudgetPage", () => {
  it("carga ingreso, gasto fijo y categoría y calcula disponible", async () => {
    const user = userEvent.setup();
    renderApp(<BudgetPage />);

    const incomes = await screen.findByRole("region", { name: "Ingresos" });
    await user.click(within(incomes).getByRole("button", { name: "Agregar" }));
    await user.type(within(incomes).getByLabelText("Nombre"), "Sueldo");
    await user.type(within(incomes).getByLabelText("Monto"), "500.000");
    await user.click(within(incomes).getByRole("button", { name: "Guardar" }));
    expect(await within(incomes).findByText("Sueldo")).toBeInTheDocument();

    const fixed = screen.getByRole("region", { name: "Gastos fijos" });
    await user.click(within(fixed).getByRole("button", { name: "Agregar" }));
    await user.type(within(fixed).getByLabelText("Nombre"), "Alquiler");
    await user.type(within(fixed).getByLabelText("Monto"), "200.000");
    await user.type(within(fixed).getByLabelText("Categoría"), "Vivienda");
    await user.click(within(fixed).getByRole("button", { name: "Guardar" }));
    expect(await within(fixed).findByText(/Alquiler/)).toBeInTheDocument();

    const cats = screen.getByRole("region", { name: "Presupuesto variable" });
    await user.click(within(cats).getByRole("button", { name: "Agregar" }));
    await user.type(within(cats).getByLabelText("Nombre"), "Comida");
    await user.type(within(cats).getByLabelText("Monto mensual"), "100.000");
    await user.click(within(cats).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByTestId("budget-available-ARS-2026-09")).toHaveTextContent(/200\.000,00/);
  });

  it("valida fin anterior al inicio", async () => {
    const user = userEvent.setup();
    renderApp(<BudgetPage />);
    const incomes = await screen.findByRole("region", { name: "Ingresos" });
    await user.click(within(incomes).getByRole("button", { name: "Agregar" }));
    await user.type(within(incomes).getByLabelText("Nombre"), "Bono");
    await user.type(within(incomes).getByLabelText("Monto"), "1000");
    const end = within(incomes).getByLabelText("Mes de fin");
    await user.type(end, "2026-01");
    await user.click(within(incomes).getByRole("button", { name: "Guardar" }));
    expect(await within(incomes).findByText(/fin debe ser igual o posterior/)).toBeInTheDocument();
  });
});
```

Nota: si `user.type` no escribe en `<input type="month">` en jsdom, usar `fireEvent.change(end, { target: { value: "2026-01" } })`.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/budget`
Expected: FAIL, la página todavía es un stub.

- [ ] **Step 3: Implementar `RecurringForm.tsx` y `RecurringList.tsx`**

`src/features/budget/RecurringForm.tsx`:
```tsx
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
```

`src/features/budget/RecurringList.tsx`:
```tsx
import { formatMoney, type Currency, type Money } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import { ConfirmButton } from "../../ui/ConfirmButton";

interface Item {
  id: string;
  name: string;
  amount: Money;
  currency: Currency;
  startMonth: Month;
  endMonth?: Month;
  category?: string;
}

interface Props<T extends Item> {
  items: T[];
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
}

export function RecurringList<T extends Item>({ items, onEdit, onDelete }: Props<T>) {
  if (items.length === 0) return <p className="text-sm text-slate-500">Sin registros.</p>;
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-2 py-2">
          <button type="button" className="flex-1 text-left" onClick={() => onEdit(i)}>
            <span className="block">
              {i.name}
              {i.category ? ` · ${i.category}` : ""}
            </span>
            <span className="text-xs text-slate-500 capitalize">
              {formatMonth(i.startMonth)} – {i.endMonth ? formatMonth(i.endMonth) : "sin fin"}
            </span>
          </button>
          <span className="font-medium">{formatMoney(i.amount, i.currency)}</span>
          <ConfirmButton label="Borrar" className="text-sm text-red-600" onConfirm={() => onDelete(i.id)} />
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Implementar las secciones**

`src/features/budget/IncomesSection.tsx`:
```tsx
import { useState } from "react";
import { useAppData, useIncomes, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import type { Income } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";
import { smallButtonClass } from "../../ui/styles";
import { RecurringForm, type RecurringValues } from "./RecurringForm";
import { RecurringList } from "./RecurringList";

export function IncomesSection() {
  const { repos } = useAppData();
  const items = useIncomes();
  const { month } = useToday();
  const [editing, setEditing] = useState<Income | "new" | null>(null);

  async function save(v: RecurringValues) {
    const fields = { name: v.name, amount: v.amount, currency: v.currency, startMonth: v.startMonth, endMonth: v.endMonth };
    await repos.incomes.put(editing && editing !== "new" ? { ...editing, ...fields } : newEntity(fields));
    setEditing(null);
  }

  return (
    <Panel
      title="Ingresos"
      actions={editing === null && <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>Agregar</button>}
    >
      {editing !== null && (
        <RecurringForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          defaultStartMonth={month}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <RecurringList items={items ?? []} onEdit={setEditing} onDelete={(id) => void repos.incomes.remove(id)} />
    </Panel>
  );
}
```

`src/features/budget/FixedExpensesSection.tsx`:
```tsx
import { useState } from "react";
import { useAppData, useFixedExpenses, useToday } from "../../app/hooks";
import { newEntity } from "../../data/repository";
import type { FixedExpense } from "../../domain/schemas";
import { Panel } from "../../ui/Panel";
import { smallButtonClass } from "../../ui/styles";
import { RecurringForm, type RecurringValues } from "./RecurringForm";
import { RecurringList } from "./RecurringList";

export function FixedExpensesSection() {
  const { repos } = useAppData();
  const items = useFixedExpenses();
  const { month } = useToday();
  const [editing, setEditing] = useState<FixedExpense | "new" | null>(null);

  async function save(v: RecurringValues) {
    const fields = {
      name: v.name,
      amount: v.amount,
      currency: v.currency,
      startMonth: v.startMonth,
      endMonth: v.endMonth,
      category: v.category ?? "General",
    };
    await repos.fixedExpenses.put(editing && editing !== "new" ? { ...editing, ...fields } : newEntity(fields));
    setEditing(null);
  }

  return (
    <Panel
      title="Gastos fijos"
      actions={editing === null && <button type="button" className={smallButtonClass} onClick={() => setEditing("new")}>Agregar</button>}
    >
      {editing !== null && (
        <RecurringForm
          key={editing === "new" ? "new" : editing.id}
          withCategory
          initial={editing === "new" ? undefined : editing}
          defaultStartMonth={month}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <RecurringList items={items ?? []} onEdit={setEditing} onDelete={(id) => void repos.fixedExpenses.remove(id)} />
    </Panel>
  );
}
```

`src/features/budget/CategoriesSection.tsx`:
```tsx
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
```

`src/features/budget/BudgetTable.tsx`:
```tsx
import { emptyBreakdown, type BudgetData } from "../../domain/budget";
import { CURRENCIES, formatMoney } from "../../domain/money";
import { formatMonth, type Month } from "../../domain/month";
import { project } from "../../domain/projection";
import { Panel } from "../../ui/Panel";

export function BudgetTable({ data, from }: { data: BudgetData; from: Month }) {
  const projection = project(data, from, 12);
  const currencies = CURRENCIES.filter((c) => projection.some((p) => p.breakdown[c]));
  if (currencies.length === 0) return null;
  return (
    <>
      {currencies.map((c) => (
        <Panel key={c} title={`Proyección · ${c}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left font-normal">Mes</th>
                  <th className="text-right font-normal">Ingresos</th>
                  <th className="text-right font-normal">Fijos</th>
                  <th className="text-right font-normal">Cuotas</th>
                  <th className="text-right font-normal">Variable</th>
                  <th className="text-right font-normal">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((p) => {
                  const b = p.breakdown[c] ?? emptyBreakdown();
                  return (
                    <tr key={p.month}>
                      <td className="capitalize">{formatMonth(p.month)}</td>
                      <td className="text-right">{formatMoney(b.income, c)}</td>
                      <td className="text-right">{formatMoney(b.fixed, c)}</td>
                      <td className="text-right">{formatMoney(b.installments, c)}</td>
                      <td className="text-right">{formatMoney(b.variable, c)}</td>
                      <td
                        data-testid={`budget-available-${c}-${p.month}`}
                        className={`text-right font-semibold ${b.available < 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {formatMoney(b.available, c)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </>
  );
}
```

`src/features/budget/BudgetPage.tsx`:
```tsx
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
```

- [ ] **Step 5: Correr los tests y los chequeos**

Run: `npx vitest run src/features/budget && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/budget
git commit -m "feat(budget): add incomes, fixed expenses, categories and 12-month table" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: UI de backup + recordatorio

**Files:**
- Create: `src/features/settings/BackupSection.tsx`, `src/app/BackupReminder.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`, `src/app/Layout.tsx` (agregar `<BackupReminder />` debajo de `<StorageBanner />`)
- Test: `src/features/settings/BackupSection.test.tsx`, `src/app/BackupReminder.test.tsx`

**Interfaces:**
- Consumes: `exportBackup`, `importBackup`, `parseBackupText`, `backupSummary`, `backupFileName`, `shouldRemindBackup`, `BackupFile` (Task 10); `useAppData`, `useMeta`, `useCards`, `usePurchases` (Task 11); `downloadJson`, `Panel`, estilos (Task 11)
- Produces: `BackupSection()`, `BackupReminder()`

- [ ] **Step 1: Escribir los tests que fallan**

`src/features/settings/BackupSection.test.tsx`:
```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeCard } from "../../test/factories";
import { renderApp } from "../../test/render";
import { SCHEMA_VERSION } from "../../data/db";
import { BackupSection } from "./BackupSection";

vi.mock("../../ui/download", () => ({ downloadJson: vi.fn() }));

function file(content: string) {
  return new File([content], "backup.json", { type: "application/json" });
}

describe("BackupSection", () => {
  it("archivo inválido muestra error y no toca los datos", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BackupSection />);
    await repos.cards.put(makeCard({ name: "Visa" }));
    await user.upload(screen.getByLabelText("Importar backup"), file("{\"foo\":1}"));
    expect(await screen.findByText("El archivo no es un backup de Cuotas.")).toBeInTheDocument();
    expect(await repos.cards.list()).toHaveLength(1);
  });

  it("archivo válido muestra resumen y reemplaza al confirmar", async () => {
    const user = userEvent.setup();
    const { repos } = renderApp(<BackupSection />);
    await repos.cards.put(makeCard({ name: "Vieja" }));
    const backup = {
      app: "cuotas-app",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-09-30T00:00:00.000Z",
      data: { cards: [makeCard({ name: "Nueva" })], purchases: [], incomes: [], fixedExpenses: [], categories: [] },
    };
    await user.upload(screen.getByLabelText("Importar backup"), file(JSON.stringify(backup)));
    expect(await screen.findByText(/1 tarjetas/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reemplazar mis datos" }));
    await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
    expect(await screen.findByText("Datos importados.")).toBeInTheDocument();
    expect((await repos.cards.list()).map((c) => c.name)).toEqual(["Nueva"]);
  });
});
```

`src/app/BackupReminder.test.tsx`:
```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeCard } from "../test/factories";
import { renderApp } from "../test/render";
import { BackupReminder } from "./BackupReminder";

describe("BackupReminder", () => {
  it("aparece con datos y sin backup previo", async () => {
    const { repos } = renderApp(<BackupReminder />);
    await repos.cards.put(makeCard());
    expect(await screen.findByText(/no hacés backup/)).toBeInTheDocument();
  });

  it("no aparece sin datos", async () => {
    renderApp(<BackupReminder />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/no hacés backup/)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run src/features/settings/BackupSection.test.tsx src/app/BackupReminder.test.tsx`
Expected: FAIL, no se pueden resolver los módulos.

- [ ] **Step 3: Implementar `BackupSection.tsx`**

```tsx
import { useId, useState, type ChangeEvent } from "react";
import { useAppData, useMeta } from "../../app/hooks";
import {
  backupFileName, backupSummary, exportBackup, importBackup, parseBackupText, type BackupFile,
} from "../../data/backup";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { downloadJson } from "../../ui/download";
import { Panel } from "../../ui/Panel";
import { buttonClass, dangerButtonClass, secondaryButtonClass } from "../../ui/styles";

export function BackupSection() {
  const id = useId();
  const { db } = useAppData();
  const meta = useMeta();
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    downloadJson(backupFileName(), await exportBackup(db));
    setMessage("Backup exportado.");
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const selected = input.files?.[0];
    input.value = "";
    if (!selected) return;
    const result = parseBackupText(await selected.text());
    setMessage(null);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    setError(null);
    setPending(result.backup);
  }

  async function confirmImport() {
    if (!pending) return;
    downloadJson(`antes-de-importar-${backupFileName()}`, await exportBackup(db));
    await importBackup(db, pending);
    setPending(null);
    setMessage("Datos importados.");
  }

  const summary = pending ? backupSummary(pending) : null;

  return (
    <Panel title="Backup">
      <p className="text-sm text-slate-500">
        Tus datos viven sólo en este teléfono. Exportá un backup seguido.
        {meta?.lastBackupAt && ` Último: ${new Date(meta.lastBackupAt).toLocaleDateString("es-AR")}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => void handleExport()}>
          Exportar backup
        </button>
        <label htmlFor={`${id}-file`} className={`${secondaryButtonClass} cursor-pointer`}>
          Importar backup
        </label>
        <input id={`${id}-file`} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void handleFile(e)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      {pending && summary && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">
          <p>
            El backup tiene {summary.cards} tarjetas, {summary.purchases} compras, {summary.incomes} ingresos,{" "}
            {summary.fixedExpenses} gastos fijos y {summary.categories} categorías. Reemplaza todos tus datos actuales
            (antes se descarga una copia de lo que tenés).
          </p>
          <div className="flex gap-2">
            <ConfirmButton label="Reemplazar mis datos" className={dangerButtonClass} onConfirm={confirmImport} />
            <button type="button" className={secondaryButtonClass} onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 4: Implementar `BackupReminder.tsx` y conectarlo**

`src/app/BackupReminder.tsx`:
```tsx
import { Link } from "react-router";
import { shouldRemindBackup } from "../data/backup";
import { useCards, useMeta, usePurchases } from "./hooks";

export function BackupReminder() {
  const meta = useMeta();
  const cards = useCards();
  const purchases = usePurchases();
  if (!meta || !cards || !purchases) return null;
  if (!shouldRemindBackup(meta, cards.length + purchases.length > 0, new Date())) return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      Hace más de 30 días que no hacés backup (o nunca hiciste).{" "}
      <Link to="/ajustes" className="font-semibold underline">Exportar ahora</Link>
    </div>
  );
}
```

En `src/app/Layout.tsx`, agregar el import y renderizarlo debajo del banner:
```tsx
import { BackupReminder } from "./BackupReminder";
```
```tsx
      <StorageBanner />
      <BackupReminder />
```

`src/features/settings/SettingsPage.tsx`:
```tsx
import { BackupSection } from "./BackupSection";
import { CardsSection } from "./CardsSection";

export function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Ajustes</h1>
      <CardsSection />
      <BackupSection />
      <p className="text-center text-xs text-slate-500">Cuotas · versión {__APP_VERSION__}</p>
    </>
  );
}
```

- [ ] **Step 5: Correr todos los chequeos**

Run: `npm test && npm run lint && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings src/app
git commit -m "feat(settings): add backup export/import ui and backup reminder" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: PWA (instalable, offline, aviso de actualización)

**Files:**
- Create: `public/icon.svg`, `src/app/UpdatePrompt.tsx`
- Modify: `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `index.html`, `package.json`

**Interfaces:**
- Produces: build con `dist/sw.js` y `dist/manifest.webmanifest`; `UpdatePrompt()` renderizado fuera de las rutas.

- [ ] **Step 1: Instalar**

```bash
npm install -D vite-plugin-pwa workbox-window @vite-pwa/assets-generator
```

- [ ] **Step 2: Crear el ícono y generar los PNG**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#4f46e5"/>
  <rect x="96" y="160" width="320" height="200" rx="28" fill="#fff"/>
  <rect x="96" y="200" width="320" height="40" fill="#c7d2fe"/>
  <rect x="128" y="290" width="48" height="32" rx="6" fill="#4f46e5"/>
  <rect x="192" y="290" width="48" height="32" rx="6" fill="#818cf8"/>
  <rect x="256" y="290" width="48" height="32" rx="6" fill="#c7d2fe"/>
</svg>
```

Agregar el script en `package.json`:
```json
"generate-pwa-assets": "pwa-assets-generator --preset minimal-2023 public/icon.svg"
```

Run: `npm run generate-pwa-assets`
Expected: se crean en `public/` `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png` y `favicon.ico`.

- [ ] **Step 3: Configurar el plugin en `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png", "icon.svg"],
      manifest: {
        name: "Cuotas",
        short_name: "Cuotas",
        description: "Cuotas de tarjetas y presupuesto mensual",
        lang: "es-AR",
        display: "standalone",
        start_url: ".",
        scope: ".",
        theme_color: "#4f46e5",
        background_color: "#f1f5f9",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"] },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "dev"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

En `tsconfig.json`, cambiar `"types": ["node"]` por:
```json
"types": ["node", "vite-plugin-pwa/react"]
```

En `index.html`, agregar dentro de `<head>`:
```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

Nota: Vite reescribe los `href` absolutos de `index.html` según `base`, así que funcionan en GitHub Pages.

- [ ] **Step 4: Crear `src/app/UpdatePrompt.tsx` y montarlo**

```tsx
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-lg">
      <span>Actualización disponible</span>
      <div className="flex gap-3">
        <button type="button" onClick={() => setNeedRefresh(false)}>Después</button>
        <button type="button" className="font-semibold text-indigo-300" onClick={() => void updateServiceWorker(true)}>
          Recargar
        </button>
      </div>
    </div>
  );
}
```

En `src/main.tsx`, importarlo y renderizarlo junto a `<App />` dentro de `RepoProvider`:
```tsx
import { UpdatePrompt } from "./app/UpdatePrompt";
```
```tsx
      <RepoProvider db={db}>
        <App />
        <UpdatePrompt />
      </RepoProvider>
```

- [ ] **Step 5: Verificar el build**

Run: `npm run build && ls dist`
Expected: `dist/` contiene `sw.js`, `manifest.webmanifest` e `index.html`. Después correr `npm test && npm run lint && npm run typecheck`: todo PASS.

- [ ] **Step 6: Verificación manual**

Run: `npm run preview` y abrir la URL en Chrome. En DevTools, pestaña Application: el manifest es válido y el service worker está activo. Con Network en "Offline", recargar: la app carga.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(pwa): make app installable and offline with update prompt" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: E2E + CI/CD a GitHub Pages

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/ci.yml`, `README.md`
- Modify: `package.json` (script `e2e`)

**Interfaces:**
- Consumes: toda la app. Labels usados: "Agregar tarjeta", "Nombre", "Día de cierre", "Guardar", "Nueva compra", "Descripción", "Cantidad de cuotas", "Valor de la cuota", "Guardar compra".

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Agregar en los scripts de `package.json`:
```json
"e2e": "playwright test"
```

- [ ] **Step 2: Escribir la configuración y el test**

`playwright.config.ts`:
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { ...devices["Pixel 7"], baseURL: "http://localhost:4173" },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

`e2e/smoke.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("crear tarjeta, cargar compra y verla en Inicio y Compras", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByText("Agregá tu primera tarjeta")).toBeVisible();

  await page.goto("/#/ajustes");
  await page.getByRole("button", { name: "Agregar tarjeta" }).click();
  await page.getByLabel("Nombre").fill("Visa");
  await page.getByLabel("Día de cierre").fill("25");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("cierra día 25")).toBeVisible();

  await page.getByRole("link", { name: "Inicio" }).click();
  await page.getByRole("link", { name: "Nueva compra" }).click();
  await page.getByLabel("Descripción").fill("Heladera");
  await page.getByLabel("Cantidad de cuotas").fill("12");
  await page.getByLabel("Valor de la cuota").fill("10000");
  await page.getByRole("button", { name: "Guardar compra" }).click();

  await expect(page.getByText("Heladera")).toBeVisible();
  await page.getByRole("link", { name: "Inicio" }).click();
  await expect(page.getByText("Visa").first()).toBeVisible();
  await expect(page.getByText(/1 compra · última cuota/)).toBeVisible();
});
```

- [ ] **Step 3: Correr el e2e**

Run: `npm run e2e`
Expected: 1 test PASS.

- [ ] **Step 4: Crear el workflow de CI/CD**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          CI: "true"
      - run: npm run build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Escribir el `README.md`**

```markdown
# Cuotas

PWA para ver cuotas de tarjetas de crédito, presupuesto mensual y cuánto queda para invertir.
Los datos se guardan sólo en el dispositivo (IndexedDB). Hacé backups desde Ajustes.

## Desarrollo

    npm install
    npm run dev        # servidor local
    npm test           # tests unitarios y de componentes
    npm run e2e        # test end-to-end (Playwright)
    npm run lint && npm run typecheck

## Deploy (GitHub Pages)

1. Crear un repo en GitHub y hacer push de `main`.
2. En el repo: Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` corre lint, typecheck, tests y e2e, y publica en `https://<usuario>.github.io/<repo>/`.

## Instalar en el celular

Abrir la URL en Chrome (Android) o Safari (iOS) → menú → **Agregar a pantalla de inicio**.
Funciona offline.

## Arquitectura

- `src/domain`: lógica pura (cuotas, cierre, presupuesto, proyección). Sin React ni DB.
- `src/data`: `Repository<T>` + Dexie. Para sincronizar en la nube (v3) se agrega otra implementación de `Repository`.
- `src/features`: pantallas. Sólo acceden a datos vía hooks de `src/app/hooks.ts`.

Spec: `docs/superpowers/specs/2026-09-30-cuotas-app-design.md`
```

- [ ] **Step 6: Correr la verificación final completa**

Run: `npm run lint && npm run typecheck && npm test && npm run e2e && npm run build`
Expected: todo PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "ci: add playwright smoke test and github pages deploy workflow" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Publicación (requiere al usuario)**

Crear el repo remoto y hacer push publica el código, así que se hace **sólo con la confirmación explícita del usuario**. Preguntar el nombre del repo y si lo quiere público o privado. En la cuenta gratuita de GitHub, Pages con repo privado requiere un plan pago. Luego:

```bash
gh repo create <nombre> --source . --push --public
```

Después habilitar Pages en Settings → Pages → Source: GitHub Actions.
