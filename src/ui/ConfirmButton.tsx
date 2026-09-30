import { useEffect, useState } from "react";

interface ConfirmButtonProps {
  label: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  confirmLabel?: string;
}

/** Botón de dos toques: evita confirm(), que no funciona bien en todos los contextos. */
export function ConfirmButton({
  label,
  onConfirm,
  className,
  confirmLabel = "¿Seguro? Tocá de nuevo",
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={className}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          void onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
