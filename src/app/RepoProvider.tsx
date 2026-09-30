import { useMemo, type ReactNode } from "react";
import type { CuotasDB } from "../data/db";
import { createRepos } from "../data/repos";
import { AppDataContext } from "./context";

export function RepoProvider({ db, children }: { db: CuotasDB; children: ReactNode }) {
  const value = useMemo(() => ({ db, repos: createRepos(db) }), [db]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
