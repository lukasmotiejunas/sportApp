import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Check,
  ExternalLink,
  Landmark,
  Loader2,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { ApiError } from "../../api/client";
import {
  fetchConnectStatus,
  openConnectDashboard,
  startConnectOnboarding,
  type ConnectStatus,
} from "../../api/connect";

// Handles the club's Stripe Connect Express onboarding on behalf of the
// AdminSubscription page. Three states: not-started, in-progress, ready.
export function ConnectSection() {
  const push = useStore((s) => s.pushToast);
  const location = useLocation();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"onboard" | "dashboard" | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchConnectStatus();
      setStatus(s);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko įkelti Stripe būsenos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stripe redirects back to /admin/subscription?connect=done — re-fetch on
  // return so the UI reflects the newly-verified state immediately.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("connect") === "done" || params.get("connect") === "refresh") {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const startOnboarding = async () => {
    setBusy("onboard");
    try {
      const { url } = await startConnectOnboarding();
      window.location.href = url;
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko pradėti Stripe registracijos.",
      });
      setBusy(null);
    }
  };

  const openDashboard = async () => {
    setBusy("dashboard");
    try {
      const { url } = await openConnectDashboard();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      push({
        kind: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Nepavyko atidaryti Stripe skydelio.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface mt-6 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
          <Landmark className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-ink-900 dark:text-ink-50">
            Priimti mokėjimus iš narių
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Prijunkite savo banko sąskaitą per Stripe — nariai mokės tiesiogiai
            jums, o Lumo automatiškai pasiims platformos mokestį.
          </p>
        </div>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Kraunama…
        </p>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && status && (
        <>
          {!status.connected && (
            <NotStarted
              onStart={startOnboarding}
              busy={busy === "onboard"}
            />
          )}

          {status.connected && !status.chargesEnabled && (
            <InProgress
              requirements={status.requirementsDue}
              onContinue={startOnboarding}
              busy={busy === "onboard"}
            />
          )}

          {status.connected && status.chargesEnabled && (
            <Ready
              bankLast4={status.bankLast4}
              bankName={status.bankName}
              payoutsEnabled={status.payoutsEnabled}
              onOpenDashboard={openDashboard}
              busy={busy === "dashboard"}
            />
          )}
        </>
      )}
    </section>
  );
}

function NotStarted({
  onStart,
  busy,
}: {
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-3 text-xs text-ink-600 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-300">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Stripe atidarys registracijos formą naujame lange. Reikės pateikti
          asmens dokumentą ir savo banko sąskaitos IBAN.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="btn-primary"
      >
        {busy ? "Vedama į Stripe…" : "Prijungti banko sąskaitą"}
      </button>
    </div>
  );
}

function InProgress({
  requirements,
  onContinue,
  busy,
}: {
  requirements: string[];
  onContinue: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Registracija nebaigta</p>
            {requirements.length > 0 && (
              <>
                <p className="mt-1 text-xs opacity-80">
                  Stripe dar laukia šių duomenų:
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs opacity-80">
                  {requirements.slice(0, 6).map((r) => (
                    <li key={r}>
                      <code>{r}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onContinue}
        disabled={busy}
        className="btn-primary"
      >
        {busy ? "Vedama į Stripe…" : "Baigti Stripe registraciją"}
      </button>
    </div>
  );
}

function Ready({
  bankLast4,
  bankName,
  payoutsEnabled,
  onOpenDashboard,
  busy,
}: {
  bankLast4: string | null;
  bankName: string | null;
  payoutsEnabled: boolean;
  onOpenDashboard: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Priimate mokėjimus</p>
          <p className="mt-1 text-xs opacity-80">
            {bankLast4
              ? `Išmokos į ${bankName ?? "banką"} •••• ${bankLast4}`
              : "Banko sąskaita prijungta."}
            {!payoutsEnabled &&
              " · Išmokos laikinai išjungtos, žr. Stripe skydelį."}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenDashboard}
        disabled={busy}
        className="btn-primary"
      >
        <ExternalLink className="h-4 w-4" />
        {busy ? "Kraunama…" : "Atidaryti Stripe skydelį"}
      </button>
    </div>
  );
}
