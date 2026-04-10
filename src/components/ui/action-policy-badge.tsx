import { cn } from "@/lib/utils";

type ActionPolicyBadgeProps = {
  label: string;
  tone: "allowed" | "blocked" | "info";
};

const toneMap = {
  allowed: "bg-emerald-100 text-emerald-800",
  blocked: "bg-slate-200 text-slate-700",
  info: "bg-sky-100 text-sky-800"
};

export function ActionPolicyBadge({ label, tone }: ActionPolicyBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]", toneMap[tone])}>
      {label}
    </span>
  );
}
