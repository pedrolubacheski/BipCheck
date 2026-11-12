import { type SelectHTMLAttributes, useId } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string };

export function SelectField({ label, className = '', children, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-base font-semibold text-slate-800">
        {label}
      </label>
      <select
        id={id}
        className="min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-lg text-slate-900 transition-shadow focus:border-emerald-700 focus:ring-4 focus:ring-emerald-200 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
