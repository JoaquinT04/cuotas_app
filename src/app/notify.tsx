import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NotifyContext } from "./notifyContext";

const AUTO_HIDE_MS = 5000;
const BACKSTOP_MESSAGE = "Algo no se pudo guardar. Probá de nuevo.";

/** Un único aviso flotante para errores de escritura; también atrapa promesas rechazadas sin manejar. */
export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const notify = useCallback((message: string) => {
    setToast((prev) => ({ message, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onRejection = () => notify(BACKSTOP_MESSAGE);
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [notify]);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toast.message}
        </div>
      )}
    </NotifyContext.Provider>
  );
}
