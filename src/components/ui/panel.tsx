import { ReactNode } from "react";

type PanelProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, description, action, children }: PanelProps) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-panel backdrop-blur">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

