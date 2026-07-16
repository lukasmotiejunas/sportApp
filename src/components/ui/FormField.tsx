import clsx from 'clsx';
import { forwardRef } from 'react';

type BaseProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

type InputProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>;

export const FormField = forwardRef<HTMLInputElement, InputProps>(function FormField(
  { label, hint, error, required, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name ?? `f-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        {...props}
        className={clsx('input', props.disabled && 'opacity-60', error && 'border-red-400 focus:border-red-500')}
      />
      {(hint || error) && (
        <p className={clsx('mt-1.5 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-ink-500')}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

type TextareaProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextareaField({ label, hint, error, required, className, id, ...props }: TextareaProps) {
  const textId = id ?? props.name ?? `ta-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={textId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        id={textId}
        {...props}
        className={clsx(
          'input h-auto py-2.5 min-h-[92px] resize-y',
          error && 'border-red-400 focus:border-red-500',
        )}
      />
      {(hint || error) && (
        <p className={clsx('mt-1.5 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-ink-500')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

type SelectProps = BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode };

export function SelectField({ label, hint, error, required, className, id, children, ...props }: SelectProps) {
  const selectId = id ?? props.name ?? `s-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={selectId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={clsx('input pr-9 appearance-none', error && 'border-red-400 focus:border-red-500')}
      >
        {children}
      </select>
      {(hint || error) && (
        <p className={clsx('mt-1.5 text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-ink-500')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
