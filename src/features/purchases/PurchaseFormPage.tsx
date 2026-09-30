import { useNavigate, useParams } from "react-router";
import { useAppData, usePurchases } from "../../app/hooks";
import { ConfirmButton } from "../../ui/ConfirmButton";
import { dangerButtonClass } from "../../ui/styles";
import { PurchaseForm } from "./PurchaseForm";

export function PurchaseFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const purchases = usePurchases();
  const { repos } = useAppData();

  if (id && !purchases) return <p>Cargando…</p>;
  const initial = id ? purchases?.find((p) => p.id === id) : undefined;
  if (id && !initial) return <p>No se encontró la compra.</p>;

  return (
    <>
      <h1 className="text-xl font-bold">{initial ? "Editar compra" : "Nueva compra"}</h1>
      <PurchaseForm key={initial?.id ?? "new"} initial={initial} onSaved={() => navigate("/compras")} />
      {initial && (
        <ConfirmButton
          label="Eliminar compra"
          className={`${dangerButtonClass} w-full`}
          onConfirm={async () => {
            await repos.purchases.remove(initial.id);
            navigate("/compras");
          }}
        />
      )}
    </>
  );
}
