import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LinkButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100"
};

export function LinkButton({ href, children, variant = "secondary" }: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
        variants[variant]
      )}
    >
      {children}
    </Link>
  );
}
