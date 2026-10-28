import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-label">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        className="input-field w-full rounded-lg px-3 py-2 outline-none transition"
        {...props}
      />
      {error && <p className="mt-1 text-sm error-text">{error}</p>}
    </div>
  );
}
