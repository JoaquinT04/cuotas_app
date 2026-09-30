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
