type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-panel backdrop-blur">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

