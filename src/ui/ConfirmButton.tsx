import { useEffect, useRef, useState } from "react";
import { useAction } from "../app/hooks";

interface ConfirmButtonProps {
  label: string;
  onConfirm: () => unknown;
  className?: string;
  confirmLabel?: string;
}

/** Un toque de confirmación que llega antes de esto es parte del mismo gesto (doble toque). */
const MIN_CONFIRM_DELAY_MS = 400;

/** Botón de dos toques: evita confirm(), que no funciona bien en todos los contextos. */
export function ConfirmButton({
  label,
  onConfirm,
  className,
  confirmLabel = "¿Seguro? Tocá de nuevo",
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  // performance.now() y no Date.now(): es monotónico y los tests congelan Date.
  const armedAt = useRef(0);
  const action = useAction(onConfirm);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      disabled={action.pending}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) {
          armedAt.current = performance.now();
          setArmed(true);
          return;
        }
        if (performance.now() - armedAt.current < MIN_CONFIRM_DELAY_MS) return;
        setArmed(false);
        void action.run();
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
