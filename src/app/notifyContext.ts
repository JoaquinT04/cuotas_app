import { createContext } from "react";

export type Notify = (message: string) => void;

export const NotifyContext = createContext<Notify | null>(null);
