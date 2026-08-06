import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";
import type { Role } from "../types";

const roleHome: Record<Role, string> = {
  super_admin: "/superadmin",
  admin: "/admin",
  coach: "/coach",
  member: "/member",
};

export default function Login() {
  const login = useStore((s) => s.login);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await login(email.trim(), password);
    setSubmitting(false);
    if (res.ok) {
      const role = useStore.getState().authUser?.role ?? "member";
      navigate(roleHome[role]);
    } else {
      setError(res.error ?? "Nepavyko prisijungti.");
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="relative isolate mx-auto grid min-h-screen max-w-5xl grid-cols-1 lg:grid-cols-2">
        <div className="hero-gradient absolute inset-0 -z-10" />
        <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
          <img
            src="/lumo-logo.png"
            alt="Lumo"
            className="w-72 max-w-full sm:w-96 lg:w-[28rem] xl:w-[32rem]"
          />
          <div className="max-w-md text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Prisijunkite prie savo paskyros.
            </h1>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-t-3xl bg-white p-6 text-ink-900 shadow-pop sm:p-10 lg:rounded-none lg:rounded-l-3xl">
          <h2 className="font-display text-xl font-bold">Prisijungimas</h2>
          <p className="text-sm text-ink-500">
            Įveskite savo prisijungimo duomenis.
          </p>

          <form onSubmit={submit} className="mt-2 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-700">
                El. paštas
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-ink-900"
                placeholder="jus@pavyzdys.lt"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-ink-700">
                Slaptažodis
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-ink-900"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 font-semibold text-white transition-all hover:bg-ink-800 disabled:opacity-60"
            >
              {submitting ? "Jungiamasi…" : "Prisijungti"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-ink-400">
            <span className="h-px flex-1 bg-ink-200" />
            arba
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <div className="mt-6 rounded-2xl border border-lime-300 bg-lime-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-ink-950">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-ink-900">
                  Turite sporto klubą?
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  Prenumeruokite Lumo už €0,50 per mėnesį — sukurkite savo klubą
                  per kelias minutes.
                </p>
              </div>
            </div>
            <Link
              to="/plans"
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
            >
              Sukurti klubą
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-ink-400">
            <Link to="/terms" className="hover:text-ink-700">
              Paslaugų sąlygos
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-ink-700">
              Privatumo politika
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
