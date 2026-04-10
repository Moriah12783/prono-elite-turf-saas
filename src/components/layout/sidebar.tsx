"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navigationItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-[2rem] border border-brand-200/70 bg-slate-950 px-5 py-6 text-white shadow-panel lg:min-h-[calc(100vh-3rem)] lg:w-72">
      <div className="mb-8 space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-brand-300">PRONO ELITE TURF</p>
        <div>
          <h1 className="text-2xl font-semibold">Admin SaaS</h1>
          <p className="mt-2 text-sm text-slate-300">
            Operations quotidiennes, workflow editorial et socle publication pour Elite Turf.
          </p>
        </div>
      </div>

      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                isActive
                  ? "bg-brand-400 text-slate-950"
                  : "text-slate-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">MVP cadre par le cahier des charges</p>
        <p className="mt-2">
          Architecture prete pour auth avancee, moteur IA, connecteurs externes et publication automatisee.
        </p>
      </div>
    </aside>
  );
}
