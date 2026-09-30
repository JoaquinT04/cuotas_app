import { useId, type ReactNode } from "react";

interface PanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, actions, children }: PanelProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2">
          {title && (
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
