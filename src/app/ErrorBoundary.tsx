import { Component, type ReactNode } from "react";
import { backupFileName, exportBackup } from "../data/backup";
import type { CuotasDB } from "../data/db";
import { downloadJson } from "../ui/download";
import { buttonClass, secondaryButtonClass } from "../ui/styles";

interface Props {
  db: CuotasDB;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { error: Error | null; exportFailed: boolean }> {
  state = { error: null as Error | null, exportFailed: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  private handleExport = async () => {
    try {
      downloadJson(backupFileName(), await exportBackup(this.props.db));
      this.setState({ exportFailed: false });
    } catch {
      this.setState({ exportFailed: true });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        <h1 className="text-xl font-bold">Algo salió mal</h1>
        <p className="text-sm text-slate-500">Tus datos siguen guardados en el teléfono.</p>
        <div className="flex justify-center gap-2">
          <button type="button" className={buttonClass} onClick={() => location.reload()}>
            Recargar
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => void this.handleExport()}>
            Exportar backup
          </button>
        </div>
        {this.state.exportFailed && (
          <p role="alert" className="text-sm text-red-600">
            No se pudo exportar el backup.
          </p>
        )}
      </div>
    );
  }
}
