import { createContext } from "react";
import type { CuotasDB } from "../data/db";
import type { Repos } from "../data/repos";

export interface AppData {
  db: CuotasDB;
  repos: Repos;
}

export const AppDataContext = createContext<AppData | null>(null);
