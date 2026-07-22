import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStore } from "../store/useStore";
import type { Role } from "../types";

const roleHome: Record<Role, string> = {
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
        <div className="flex flex-col justify-between p-6 sm:p-10">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-bold text-lime-300">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400/15 ring-1 ring-lime-400/30">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              </span>
              Volvere Club
            </div>

            <div className="mt-14 max-w-md">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-300">
                <Sparkles className="h-3 w-3" /> Bėgikai ir treneriai
              </p>
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Prisijunkite prie savo paskyros.
              </h1>
              <p className="mt-4 text-lg text-white/70">
                Nariai, treneriai ir administratoriai prisijungia su savo el.
                paštu ir slaptažodžiu.
              </p>
            </div>
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
