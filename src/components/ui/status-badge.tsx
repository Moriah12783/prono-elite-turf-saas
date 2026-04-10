import { formatStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  COLLECTED: "bg-slate-200 text-slate-700",
  PENDING_VALIDATION: "bg-amber-100 text-amber-800",
  VALIDATED: "bg-sky-100 text-sky-800",
  PREDICTION_GENERATED: "bg-indigo-100 text-indigo-800",
  DRAFT_READY: "bg-violet-100 text-violet-800",
  READY: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-slate-200 text-slate-700",
  BLOCKED: "bg-rose-100 text-rose-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PUBLISHED: "bg-brand-100 text-brand-900",
  ARCHIVED: "bg-slate-300 text-slate-800",
  RESULT_INTEGRATED: "bg-emerald-100 text-emerald-800",
  DECLARED: "bg-sky-100 text-sky-800",
  NON_RUNNER: "bg-rose-100 text-rose-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  PENDING_REVIEW: "bg-amber-100 text-amber-800",
  REJECTED: "bg-rose-100 text-rose-800",
  LOW: "bg-slate-200 text-slate-700",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-emerald-100 text-emerald-800",
  VERY_HIGH: "bg-brand-100 text-brand-900",
  PENDING: "bg-slate-200 text-slate-700",
  PARTIAL: "bg-amber-100 text-amber-800",
  OFFICIAL: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
  USER: "bg-slate-200 text-slate-700",
  RACE: "bg-sky-100 text-sky-800",
  RUNNER: "bg-indigo-100 text-indigo-800",
  PREDICTION: "bg-violet-100 text-violet-800",
  RESULT: "bg-emerald-100 text-emerald-800",
  PUBLICATION_JOB: "bg-brand-100 text-brand-900",
  AUTH_SESSION: "bg-amber-100 text-amber-800"
};

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        toneMap[status] ?? "bg-slate-200 text-slate-700"
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
