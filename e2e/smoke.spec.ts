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
