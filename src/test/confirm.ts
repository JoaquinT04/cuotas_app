import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/** ConfirmButton ignora el segundo toque si llega antes de 400 ms: esperamos como lo haría una persona. */
export async function confirmTap(user: UserEvent, button: HTMLElement): Promise<void> {
  await user.click(button);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await user.click(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" }));
}
