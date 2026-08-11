import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isLt = i18n.language.startsWith('lt');

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isLt ? 'en' : 'lt')}
      title={isLt ? 'Switch to English' : 'Perjungti į lietuvių'}
      className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 text-[11px] font-bold uppercase tracking-wide text-ink-600 transition-colors hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
    >
      {isLt ? 'EN' : 'LT'}
    </button>
  );
}
