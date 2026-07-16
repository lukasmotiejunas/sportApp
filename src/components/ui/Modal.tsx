import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'sheet' | 'centered';
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const widthClass =
    size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink-950/50 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex min-h-full items-center justify-center p-4 sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={clsx(
            'relative w-full bg-white dark:bg-ink-900 shadow-pop rounded-3xl animate-slide-up flex flex-col',
            'max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]',
            widthClass,
          )}
        >
          <div className="flex items-start gap-3 p-5 pb-3">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="shrink-0 rounded-b-3xl border-t border-ink-100 dark:border-ink-800 p-4 flex flex-wrap justify-end gap-2 bg-ink-50/60 dark:bg-ink-900/60">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
