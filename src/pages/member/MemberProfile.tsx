import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  Camera,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import Joyride, {
  STATUS,
  type CallBackProps,
  type Step,
} from "react-joyride";
import { PageTitle } from "../../components/layout/PageTitle";
import { useStore, useCurrentMember } from "../../store/useStore";
import { Avatar } from "../../components/ui/Avatar";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { FormField } from "../../components/ui/FormField";
import { formatDateLong } from "../../utils/dates";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { resizeImageToDataUrl } from "../../utils/image";
import { changePasswordApi } from "../../api/profile";
import { ApiError } from "../../api/client";

export default function MemberProfile() {
  const member = useCurrentMember();
  const plans = useStore((s) => s.membershipPlans);
  const plan = plans.find((p) => p.id === member.membershipPlanId);
  const updateMember = useStore((s) => s.updateMember);
  const logout = useStore((s) => s.logout);
  const push = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const authUserId = useStore((s) => s.authUser?.id ?? "");
  const [confirmLogout, setConfirmLogout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ kind: "error", message: "Pasirinkite paveikslėlį." });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 512, 0.85);
      updateMember(member.id, { photoUrl: dataUrl });
      push({ kind: "success", message: "Nuotrauka atnaujinta." });
    } catch {
      push({ kind: "error", message: "Nepavyko įkelti nuotraukos." });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoRemove = () => {
    updateMember(member.id, { photoUrl: "" });
    push({ kind: "info", message: "Nuotrauka pašalinta." });
  };

  const [edit, setEdit] = useState({
    name: member.name,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth,
  });

  const save = () => {
    updateMember(member.id, edit);
    push({ kind: "success", message: "Profilis atnaujintas." });
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError("Naujas slaptažodis turi būti bent 6 simbolių.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Nauji slaptažodžiai nesutampa.");
      return;
    }
    setPwBusy(true);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      push({ kind: "success", message: "Slaptažodis pakeistas." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof ApiError
          ? err.message
          : "Nepavyko pakeisti slaptažodžio.",
      );
    } finally {
      setPwBusy(false);
    }
  };

  const tourStorageKey = `member_profile_tour_seen:${authUserId || "anon"}`;
  const tourSteps: Step[] = [
    {
      target: '[data-tour="page-title"]',
      content:
        "Profilis — čia matote ir keičiate savo asmeninius duomenis, nuotrauką, slaptažodį bei atsijungiate nuo paskyros.",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="avatar-card"]',
      content:
        "Nuotrauka ir bendra informacija. Paspauskite fotoaparato ikoną prie avataro, kad įkeltumėte savo nuotrauką — ji atsiras dalyvių sąrašuose ir treniruočių puslapiuose. Čia taip pat matote savo narystės planą ir kada tapote klubo nariu.",
    },
    {
      target: '[data-tour="personal-info"]',
      content:
        "Asmeninė informacija. Vardas ir pavardė matomi klubo administratoriui ir treneriams. Telefonas — kad treneris galėtų su jumis susisiekti. Gimimo data — amžiaus grupių paskirstymui klube. Po redagavimo paspauskite „Išsaugoti pakeitimus“.",
    },
    {
      target: '[data-tour="password"]',
      content:
        "Slaptažodžio keitimas. Norėdami pakeisti — pirma įveskite dabartinį, po to du kartus naują (bent 6 simboliai). Rekomenduojama keisti retkarčiais saugumui.",
    },
    {
      target: '[data-tour="account"]',
      content:
        "Paskyra. Rodo, nuo kada esate klubo narys. Čia taip pat rasite mygtuką „Atsijungti“ — po jo būsite grąžinti į prisijungimo langą.",
      placement: "top",
    },
  ];

  useEffect(() => {
    try {
      if (!localStorage.getItem(tourStorageKey)) {
        setRunTour(true);
      }
    } catch {
      // localStorage blocked — skip silently.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTourCallback = (data: CallBackProps) => {
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (done.includes(data.status)) {
      setRunTour(false);
      try {
        localStorage.setItem(tourStorageKey, "1");
      } catch {
        // ignore
      }
    }
  };

  return (
    <div>
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableScrolling={false}
        callback={handleTourCallback}
        locale={{
          back: "Atgal",
          close: "Uždaryti",
          last: "Baigti",
          next: "Toliau",
          skip: "Praleisti",
        }}
        styles={{
          options: {
            primaryColor: "#5da004",
            zIndex: 10000,
          },
        }}
      />
      <div data-tour="page-title">
        <PageTitle
          title="Profilis"
          description="Jūsų duomenys ir nustatymai."
          eyebrow="Narys"
        />
      </div>

      <section className="surface mb-4 p-4" data-tour="avatar-card">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar
              name={member.name}
              color={member.avatarColor}
              size="xl"
              photoUrl={member.photoUrl}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border border-ink-200 bg-white text-ink-800 shadow-sm transition-colors hover:bg-ink-50 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800"
              aria-label="Įkelti nuotrauką"
              title="Įkelti nuotrauką"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{member.name}</p>
            <p className="text-sm text-ink-500">{member.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone="accent">
                {plan?.name ?? "Klubo narys"}
              </StatusBadge>
              <StatusBadge tone="info">
                Nuo {formatDateLong(member.memberSince).split(",")[1]?.trim()}
              </StatusBadge>
            </div>
            {member.photoUrl && (
              <button
                type="button"
                onClick={handlePhotoRemove}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-800 dark:hover:text-ink-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Pašalinti nuotrauką
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="surface mb-4 p-4" data-tour="personal-info">
        <h2 className="mb-3 font-display text-base font-bold">
          Asmeninė informacija
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Vardas ir pavardė"
            value={edit.name}
            onChange={(e) => setEdit({ ...edit, name: e.target.value })}
          />
          <FormField
            label="Telefonas"
            value={edit.phone}
            onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
          />
          <FormField
            label="Gimimo data"
            type="date"
            value={edit.dateOfBirth}
            onChange={(e) => setEdit({ ...edit, dateOfBirth: e.target.value })}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn-primary h-10 px-4 text-sm" onClick={save}>
            Išsaugoti pakeitimus
          </button>
        </div>
      </section>

      <section className="surface mb-4 p-4" data-tour="password">
        <div className="mb-3 flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-400/15 text-lime-600 dark:text-lime-300">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold">Slaptažodis</h2>
            <p className="mt-0.5 text-sm text-ink-500">
              Norėdami pakeisti slaptažodį, pirma įveskite dabartinį.
            </p>
          </div>
        </div>
        <form onSubmit={submitPassword} className="space-y-3">
          <FormField
            label="Dabartinis slaptažodis"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Naujas slaptažodis"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Bent 6 simboliai"
            />
            <FormField
              label="Pakartokite naują slaptažodį"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Bent 6 simboliai"
            />
          </div>
          {pwError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pwError}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary h-10 px-4 text-sm" disabled={pwBusy}>
              {pwBusy ? "Keičiama…" : "Pakeisti slaptažodį"}
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-4" data-tour="account">
        <h2 className="mb-3 font-display text-base font-bold">Paskyra</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
            <Calendar className="h-4 w-4 text-ink-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Narys nuo
              </p>
              <p className="text-sm font-semibold">
                {formatDateLong(member.memberSince)}
              </p>
            </div>
          </div>
        </div>

        <button
          className="btn-outline mt-4 w-full sm:w-auto"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut className="h-4 w-4" /> Atsijungti
        </button>
      </section>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          logout();
          navigate("/login");
        }}
        title="Atsijungti?"
        message="Būsite grąžinti į prisijungimo langą."
        confirmLabel="Atsijungti"
        cancelLabel="Likti"
      />
    </div>
  );
}

function PrefRow({
  icon: Icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: any;
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 p-3 hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-600">
      <Icon className="h-4 w-4 text-ink-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">
          {title}
        </p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
      <Switch checked={value} onChange={onChange} />
    </label>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0 transition-colors " +
        (checked ? "bg-ink-900 dark:bg-lime-400" : "bg-ink-200 dark:bg-ink-700")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-[22px]" : "translate-x-0.5")
        }
      />
    </button>
  );
}
