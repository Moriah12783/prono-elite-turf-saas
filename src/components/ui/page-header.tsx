type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">{eyebrow}</p>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

