import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-lg">
      <span>Actualización disponible</span>
      <div className="flex gap-3">
        <button type="button" onClick={() => setNeedRefresh(false)}>Después</button>
        <button type="button" className="font-semibold text-indigo-300" onClick={() => void updateServiceWorker(true)}>
          Recargar
        </button>
      </div>
    </div>
  );
}
