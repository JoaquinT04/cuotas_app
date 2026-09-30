import { Link } from "react-router";
import { Panel } from "../../ui/Panel";

export function EmptyState() {
  return (
    <Panel title="Empecemos">
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          <Link to="/ajustes" className="text-indigo-600 underline">Agregá tu primera tarjeta</Link>
        </li>
        <li>Cargá una compra con el botón +</li>
        <li>
          Completá ingresos y gastos en <Link to="/presupuesto" className="text-indigo-600 underline">Presupuesto</Link>
        </li>
      </ol>
    </Panel>
  );
}
