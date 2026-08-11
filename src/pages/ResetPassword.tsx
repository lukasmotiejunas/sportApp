import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { api } from "../api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="min-h-screen bg-ink-950 text-white flex items-center justify-center p-6">
        <div className="rounded-2xl bg-white p-8 text-ink-900 max-w-sm w-full text-center shadow-pop">
          <p className="font-semibold">Neteisinga arba pasibaigusi nuoroda.</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-sm text-ink-600 underline hover:text-ink-900"
          >
            Gauti naują nuorodą
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Nepavyko atnaujinti slaptažodžio.";
      setError(msg);
    } finally {
      setSubmitting(false);
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
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-t-3xl bg-white p-6 text-ink-900 shadow-pop sm:p-10 lg:rounded-none lg:rounded-l-3xl">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-100">
                <CheckCircle className="h-7 w-7 text-lime-600" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Slaptažodis atnaujintas</h2>
                <p className="mt-2 text-sm text-ink-500">
                  Galite prisijungti naudodami naują slaptažodį.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink-950 font-semibold text-white transition-all hover:bg-ink-800"
              >
                Prisijungti
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display text-xl font-bold">Naujas slaptažodis</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Įveskite naują slaptažodį. Minimalus ilgis – 6 simboliai.
                </p>
              </div>

              <form onSubmit={submit} className="mt-2 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink-700">
                    Naujas slaptažodis
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-ink-900"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-ink-700">
                    Pakartokite slaptažodį
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
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
                  {submitting ? "Išsaugoma…" : "Atnaujinti slaptažodį"}
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
