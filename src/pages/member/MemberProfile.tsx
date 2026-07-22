import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  User,
} from 'lucide-react';
import { PageTitle } from '../../components/layout/PageTitle';
import { useStore, useCurrentMember } from '../../store/useStore';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { FormField } from '../../components/ui/FormField';
import { formatDateLong } from '../../utils/dates';
import { formatResult } from '../../utils/format';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export default function MemberProfile() {
  const member = useCurrentMember();
  const results = useStore((s) => s.leaderboardResults);
  const categories = useStore((s) => s.leaderboardCategories);
  const plans = useStore((s) => s.membershipPlans);
  const plan = plans.find((p) => p.id === member.membershipPlanId);
  const updateMember = useStore((s) => s.updateMember);
  const logout = useStore((s) => s.logout);
  const push = useStore((s) => s.pushToast);
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const [edit, setEdit] = useState({
    name: member.name,
    email: member.email,
    phone: member.phone,
  });

  const bests = categories
    .filter((c) => c.measurementType === 'seconds')
    .map((c) => {
      const my = results
        .filter((r) => r.categoryId === c.id && r.memberId === member.id)
        .sort((a, b) => (c.lowerIsBetter ? a.value - b.value : b.value - a.value))[0];
      return my ? { c, my } : null;
    })
    .filter(Boolean) as { c: (typeof categories)[number]; my: (typeof results)[number] }[];

  const save = () => {
    updateMember(member.id, edit);
    push({ kind: 'success', message: 'Profilis atnaujintas.' });
  };

  return (
    <div>
      <PageTitle title="Profilis" description="Jūsų duomenys ir nustatymai." eyebrow="Narys" />

      <section className="surface mb-4 p-4">
        <div className="flex items-center gap-4">
          <Avatar name={member.name} color={member.avatarColor} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{member.name}</p>
            <p className="text-sm text-ink-500">{member.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone="accent">{plan?.name ?? 'Klubo narys'}</StatusBadge>
              <StatusBadge tone="info">Nuo {formatDateLong(member.memberSince).split(',')[1]?.trim()}</StatusBadge>
            </div>
          </div>
        </div>
      </section>

      <section className="surface mb-4 p-4">
        <h2 className="mb-3 font-display text-base font-bold">Asmeninė informacija</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Vardas ir pavardė" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <FormField label="El. paštas" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
          <FormField label="Telefonas" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
          <FormField label="Gimimo data" value={member.dateOfBirth} disabled />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="btn-primary h-10 px-4 text-sm" onClick={save}>
            Išsaugoti pakeitimus
          </button>
        </div>
      </section>

      <section className="surface mb-4 p-4">
        <h2 className="mb-3 font-display text-base font-bold">Asmeniniai rekordai</h2>
        {bests.length === 0 ? (
          <p className="text-sm text-ink-500">Rezultatų dar nėra.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {bests.map(({ c, my }) => (
              <div key={c.id} className="rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{c.event}</p>
                <p className="font-display text-lg font-bold tabular-nums">{formatResult(my.value, c)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface mb-4 p-4">
        <h2 className="mb-3 font-display text-base font-bold">Nustatymai</h2>
        <div className="space-y-2">
          <PrefRow
            icon={Mail}
            title="El. pašto pranešimai"
            description="Priminimai apie treniruotes ir mokėjimų naujienos."
            value={member.notificationPreferences.email}
            onChange={() => updateMember(member.id, {
              notificationPreferences: {
                ...member.notificationPreferences,
                email: !member.notificationPreferences.email,
              },
            })}
          />
          <PrefRow
            icon={Phone}
            title="SMS pranešimai"
            description="Trumpieji pranešimai prieš jūsų treniruotes."
            value={member.notificationPreferences.sms}
            onChange={() => updateMember(member.id, {
              notificationPreferences: {
                ...member.notificationPreferences,
                sms: !member.notificationPreferences.sms,
              },
            })}
          />
          <PrefRow
            icon={Bell}
            title="Programėlės pranešimai"
            description="Gyvi atnaujinimai ir rezultatų lentelės pokyčiai."
            value={member.notificationPreferences.push}
            onChange={() => updateMember(member.id, {
              notificationPreferences: {
                ...member.notificationPreferences,
                push: !member.notificationPreferences.push,
              },
            })}
          />
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="mb-3 font-display text-base font-bold">Paskyra</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
            <Calendar className="h-4 w-4 text-ink-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Narys nuo</p>
              <p className="text-sm font-semibold">{formatDateLong(member.memberSince)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/60">
            <User className="h-4 w-4 text-ink-500" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Amžiaus grupė</p>
              <p className="text-sm font-semibold">{member.ageGroup}</p>
            </div>
          </div>
        </div>

        <button
          className="btn-outline mt-4 w-full sm:w-auto"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut className="h-4 w-4" /> Keisti vaidmenį / atsijungti
        </button>
      </section>

      <ConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          logout();
          navigate('/login');
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
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{title}</p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
      <Switch checked={value} onChange={onChange} />
    </label>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0 transition-colors ' +
        (checked ? 'bg-ink-900 dark:bg-lime-400' : 'bg-ink-200 dark:bg-ink-700')
      }
    >
      <span
        className={
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ' +
          (checked ? 'translate-x-[22px]' : 'translate-x-0.5')
        }
      />
    </button>
  );
}
