import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { asStringValue } from "@/lib/validation";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message = asStringValue(params.message);
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(181,126,42,0.18),transparent_24%),linear-gradient(180deg,#f6f2ea_0%,#eef2f7_100%)] px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-panel backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">PRONO ELITE TURF</p>
          <h1 className="text-3xl font-semibold text-slate-950">Connexion admin</h1>
          <p className="text-sm leading-6 text-slate-600">
            Acces au back-office de production, validation et publication des pronostics Elite Turf.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {message ? <Notice tone={tone} message={message} /> : null}

          <form action={loginAction} className="space-y-4">
            <Field label="Email">
              <Input type="email" name="email" placeholder="admin@elite-turf.local" required />
            </Field>
            <Field label="Mot de passe">
              <Input type="password" name="password" placeholder="Votre mot de passe" required />
            </Field>
            <Button type="submit" className="w-full">
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
