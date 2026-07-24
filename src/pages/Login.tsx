import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              Nariai, treneriai ir administratoriai prisijungia su savo el.
              paštu ir slaptažodžiu.
            </p>
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
        </div>
      </div>
    </div>
  );
}
