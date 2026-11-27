import type { InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, id, name, ...props }: FieldProps) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {hint && !error && (
        <span id={`${inputId}-hint`} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${inputId}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
