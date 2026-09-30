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
