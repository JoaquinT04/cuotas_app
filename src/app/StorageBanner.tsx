import { useEffect, useState } from "react";
import { isStorageAvailable } from "../data/storage";
import { useAppData } from "./hooks";

export function StorageBanner() {
  const { db } = useAppData();
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let alive = true;
    void isStorageAvailable(db).then((available) => {
      if (alive) setOk(available);
    });
    return () => {
      alive = false;
    };
  }, [db]);
  if (ok) return null;
  return (
    <div role="alert" className="bg-red-600 px-4 py-2 text-sm text-white">
      No se pueden guardar datos en este navegador (¿modo incógnito?).
    </div>
  );
}
