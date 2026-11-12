import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner.tsx';

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline';
type Size = 'lg' | 'md';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-700 text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-slate-300 disabled:text-slate-600',
  secondary:
    'border-2 border-slate-400 bg-white text-slate-900 shadow-sm hover:bg-slate-100 active:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500',
  danger:
    'bg-red-700 text-white shadow-md shadow-red-900/20 hover:bg-red-800 active:bg-red-900 disabled:bg-slate-300 disabled:text-slate-600',
  dangerOutline:
    'border-2 border-red-700 bg-white text-red-800 hover:bg-red-50 active:bg-red-100 disabled:border-slate-300 disabled:text-slate-500',
};

// Alturas pensadas para o dedo: 56 px na ação principal, 48 px nas secundárias
const sizeClasses: Record<Size, string> = {
  lg: 'min-h-14 px-5 text-lg',
  md: 'min-h-12 px-4 text-base',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  // Ação em andamento: bloqueia o botão e troca o texto (ex.: "Salvando...")
  loading?: boolean;
  loadingLabel?: string;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  loadingLabel = 'Aguarde...',
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {loading ? loadingLabel : children}
    </button>
  );
}
