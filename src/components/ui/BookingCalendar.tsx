import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { fetchMeetingSlots, bookMeeting } from '../../api/public';
import { ApiError } from '../../api/client';

const LT_WEEKDAYS = ['Pir', 'Ant', 'Tre', 'Ket', 'Pen'];
const EN_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getWeekDays(weekOffset: number): Date[] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  monday.setHours(12, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function endTime(startTime: string): string {
  const [h] = startTime.split(':').map(Number);
  return `${String(h + 1).padStart(2, '0')}:00`;
}

export function BookingCalendar() {
  const { t, i18n } = useTranslation();
  const weekdayLabels = i18n.language === 'lt' ? LT_WEEKDAYS : EN_WEEKDAYS;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotsData, setSlotsData] = useState<{ validSlots: string[]; bookedSlots: string[] } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteText, setInviteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toDateStr(new Date());
  const weekDays = getWeekDays(weekOffset);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSlotsData(null);
    setSelectedSlot(null);
    fetchMeetingSlots(selectedDate)
      .then(setSlotsData)
      .catch(() => setSlotsData(null))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const handleDateClick = (dateStr: string) => {
    if (dateStr < today) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep('calendar');
    setError(null);
  };

  const handleSlotClick = (slot: string) => {
    setSelectedSlot(slot);
    setStep('form');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const inviteEmails = inviteText
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await bookMeeting({ date: selectedDate, startTime: selectedSlot, name, email, inviteEmails });
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('help.book_taken'));
      } else {
        setError(t('help.book_error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <section className="mt-4 surface overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-lime-400 to-green-500" />
        <div className="p-6 text-center sm:p-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-600 dark:text-lime-300">
            <Check className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-ink-50">
            {t('help.book_success_title')}
          </h3>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            {t('help.book_success_desc')}
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 dark:bg-ink-800 dark:text-ink-200">
            {selectedDate} · {selectedSlot}–{endTime(selectedSlot!)}
          </p>
        </div>
      </section>
    );
  }

  const allSlotsBooked = slotsData
    ? slotsData.validSlots.every((s) => slotsData.bookedSlots.includes(s))
    : false;

  return (
    <section className="mt-4 surface overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-lime-400 to-green-500" />
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-400/15 text-lime-600 dark:text-lime-300">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900 dark:text-ink-50">
              {t('help.book_title')}
            </h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              {t('help.book_desc')}
            </p>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              {t('help.book_hint')}
            </p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setWeekOffset((w) => Math.max(0, w - 1));
              setSelectedDate(null);
            }}
            disabled={weekOffset === 0}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
            aria-label={t('help.book_prev_week')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">
            {weekDays[0].toLocaleDateString('lt-LT', { month: 'long', day: 'numeric' })} –{' '}
            {weekDays[4].toLocaleDateString('lt-LT', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              setWeekOffset((w) => w + 1);
              setSelectedDate(null);
            }}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
            aria-label={t('help.book_next_week')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day buttons */}
        <div className="mb-4 grid grid-cols-5 gap-1.5">
          {weekDays.map((d, i) => {
            const dateStr = toDateStr(d);
            const isPast = dateStr < today;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dateStr)}
                className={clsx(
                  'flex flex-col items-center rounded-xl py-2.5 text-xs font-semibold transition-colors',
                  isSelected
                    ? 'bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950'
                    : isPast
                      ? 'cursor-not-allowed text-ink-300 dark:text-ink-600'
                      : 'bg-ink-50 text-ink-700 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
                )}
              >
                <span className="text-[10px] uppercase tracking-wider">{weekdayLabels[i]}</span>
                <span className="mt-0.5 text-base font-bold leading-tight">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="mt-2">
            {loadingSlots ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800"
                  />
                ))}
              </div>
            ) : slotsData ? (
              <>
                {allSlotsBooked ? (
                  <p className="text-sm text-ink-500">{t('help.book_no_slots')}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                    {slotsData.validSlots.map((slot) => {
                      const booked = slotsData.bookedSlots.includes(slot);
                      const isActive = selectedSlot === slot && step === 'form';
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={booked}
                          onClick={() => handleSlotClick(slot)}
                          className={clsx(
                            'rounded-lg py-2 text-center text-xs font-semibold transition-colors',
                            booked
                              ? 'cursor-not-allowed bg-ink-100 text-ink-300 dark:bg-ink-800 dark:text-ink-600'
                              : isActive
                                ? 'bg-ink-900 text-white dark:bg-lime-400 dark:text-ink-950'
                                : 'bg-ink-50 text-ink-700 hover:bg-ink-100 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700',
                          )}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* Booking form */}
        {step === 'form' && selectedSlot && (
          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-3 border-t border-ink-100 pt-5 dark:border-ink-700"
          >
            <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">
              {selectedDate} · {selectedSlot}–{endTime(selectedSlot)}
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-400">
                {t('help.book_name')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-400">
                {t('help.book_email')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-600 dark:text-ink-400">
                {t('help.book_invite_emails')}
              </label>
              <input
                type="text"
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                placeholder={t('help.book_invite_placeholder')}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50 dark:placeholder-ink-500"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('calendar');
                  setError(null);
                }}
                className="h-10 rounded-xl border border-ink-200 px-4 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                Atgal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 flex-1 rounded-xl bg-ink-950 text-sm font-semibold text-white transition-colors hover:bg-ink-800 disabled:opacity-60"
              >
                {submitting ? t('help.book_submitting') : t('help.book_submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
