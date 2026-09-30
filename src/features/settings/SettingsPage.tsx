import { BackupSection } from "./BackupSection";
import { CardsSection } from "./CardsSection";

export function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-bold">Ajustes</h1>
      <CardsSection />
      <BackupSection />
      <p className="text-center text-xs text-slate-500">Cuotas · versión {__APP_VERSION__}</p>
    </>
  );
}
