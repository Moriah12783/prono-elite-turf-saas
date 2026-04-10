import { ReactNode } from "react";

type DataStackProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

export function DataStack({ label, value, detail }: DataStackProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm text-slate-900">{value}</div>
      {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
    </div>
  );
}
