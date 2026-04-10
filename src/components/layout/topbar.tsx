import { User } from "@prisma/client";

import { logoutAction } from "@/app/(admin)/logout-action";
import { Button } from "@/components/ui/button";

export function Topbar({ user }: { user: Pick<User, "id" | "name" | "email" | "role"> }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-white/70 bg-white/75 px-6 py-5 shadow-panel backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Pilotage du jour</p>
        <p className="mt-1 text-sm text-slate-600">
          Vue operationnelle pour controler les courses, valider les pronostics et preparer la publication.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">{user.name}</p>
          <p>{user.email} • {user.role}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">Se deconnecter</Button>
        </form>
      </div>
    </header>
  );
}
