import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

const variants = {
  primary: 'btn-gold',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Button({
  loading,
  variant = 'primary',
  fullWidth = true,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${variants[variant]} ${fullWidth ? 'w-full' : ''} rounded-lg px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}
