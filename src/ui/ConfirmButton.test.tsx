import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmTap } from "../test/confirm";
import { renderApp } from "../test/render";
import { ConfirmButton } from "./ConfirmButton";

afterEach(() => vi.restoreAllMocks());

describe("ConfirmButton", () => {
  it("un segundo toque antes de 400 ms no confirma (doble toque accidental)", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderApp(<ConfirmButton label="Borrar" onConfirm={onConfirm} />);
    await user.dblClick(screen.getByRole("button", { name: "Borrar" }));
    expect(screen.getByRole("button", { name: "¿Seguro? Tocá de nuevo" })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirma con un segundo toque pasados 400 ms", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderApp(<ConfirmButton label="Borrar" onConfirm={onConfirm} />);
    await confirmTap(user, screen.getByRole("button", { name: "Borrar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("si la acción falla muestra un aviso", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    renderApp(<ConfirmButton label="Borrar" onConfirm={() => Promise.reject(new Error("x"))} />);
    await confirmTap(user, screen.getByRole("button", { name: "Borrar" }));
    expect(await screen.findByText("No se pudo guardar. Probá de nuevo.")).toBeInTheDocument();
  });
});
