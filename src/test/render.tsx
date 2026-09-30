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
