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
