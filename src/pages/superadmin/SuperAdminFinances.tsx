import { useEffect, useState } from "react";
import {
  Euro,
  Wallet,
  Receipt,
  Coins,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { PageTitle } from "../../components/layout/PageTitle";
import { ApiError } from "../../api/client";
import { fetchSuperAdminFinances } from "../../api/superadmin";
import { formatCurrency } from "../../utils/format";
import type { PlatformFinances } from "../../types";

const MONTH_NAMES_LT = [
  "Sausis",
  "Vasaris",
  "Kovas",
  "Balandis",
  "Gegužė",
  "Birželis",
  "Liepa",
  "Rugpjūtis",
  "Rugsėjis",
  "Spalis",
  "Lapkritis",
  "Gruodis",
];

// Stripe's own "wallet" for the platform account. Same URL for test + live —
// Stripe scopes it to the currently signed-in mode on their side.
const STRIPE_WALLET_URL = "https://dashboard.stripe.com/balance";

function formatMonth(key: string): string {
  const [y, m] = key.split("-");
  const idx = Number(m) - 1;
  if (!MONTH_NAMES_LT[idx]) return key;
  return `${MONTH_NAMES_LT[idx]} ${y}`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "danger" | "muted";
  hint?: string;
}) {
  const badgeClass =
    tone === "danger"
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : tone === "muted"
        ? "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
        : "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300";
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${badgeClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
          <p className="font-display text-xl font-bold text-ink-950 dark:text-ink-50">
            {value}
          </p>
          {hint && <p className="mt-0.5 text-[10px] text-ink-500">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminFinances() {
  const [data, setData] = useState<PlatformFinances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchSuperAdminFinances()
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Nepavyko įkelti finansų.",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <PageTitle
        eyebrow="Platforma"
        title="Finansai"
        description="Bendras platformos pelnas ir mokėjimų suvestinė."
        action={
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Atnaujinti
            </button>
            <a
              href={STRIPE_WALLET_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <ExternalLink className="h-4 w-4" /> Atidaryti Stripe
            </a>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="p-4 text-sm text-ink-500">Kraunama…</p>
      ) : data ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard
              label="Bendras pelnas"
              value={formatCurrency(data.totals.net)}
              icon={Euro}
              tone="positive"
              hint="Bruto − Stripe mokestis − VAT"
            />
            <KpiCard
              label="Mūsų dalis (narių)"
              value={formatCurrency(data.totals.applicationFees)}
              icon={Wallet}
              hint="Application fees"
            />
            <KpiCard
              label="Klubų prenumeratos"
              value={formatCurrency(data.totals.clubSubscriptions)}
              icon={Receipt}
              hint="Klubai moka mums"
            />
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard
              label="Bruto viso"
              value={formatCurrency(data.totals.grossTotal)}
              icon={Coins}
            />
            <KpiCard
              label="Stripe mokesčiai"
              value={formatCurrency(data.totals.stripeFees)}
              icon={Coins}
              tone="danger"
              hint="Stripe komisiniai už klubų prenumeratas"
            />
            <KpiCard
              label="Mokesčiai (VAT)"
              value={formatCurrency(data.totals.tax)}
              icon={Coins}
              tone="muted"
              hint="Surinktas PVM klubų prenumeratose"
            />
          </div>

          <section className="surface">
            <header className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <h2 className="font-display text-base font-bold text-ink-950 dark:text-ink-50">
                Pagal mėnesį
              </h2>
              <span className="text-xs text-ink-500">
                {data.months.length}{" "}
                {data.months.length === 1 ? "mėnuo" : "mėnesiai"}
              </span>
            </header>
            {data.months.length === 0 ? (
              <p className="p-4 text-sm text-ink-500">Duomenų dar nėra.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr className="border-b border-ink-100 dark:border-ink-800">
                      <th className="px-4 py-2 font-semibold">Mėnuo</th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Mūsų dalis
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Klubų prenum.
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Stripe
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">
                        VAT
                      </th>
                      <th className="px-4 py-2 font-semibold text-right">
                        Pelnas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                    {data.months.map((m) => (
                      <tr key={m.month}>
                        <td className="whitespace-nowrap px-4 py-2 font-semibold text-ink-900 dark:text-ink-50">
                          {formatMonth(m.month)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                          {formatCurrency(m.applicationFees)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                          {formatCurrency(m.clubSubscriptions)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                          −{formatCurrency(m.stripeFees)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-ink-500">
                          {formatCurrency(m.tax)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-lime-700 dark:text-lime-300">
                          {formatCurrency(m.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
