import { type SelectHTMLAttributes, useId } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string };

export function SelectField({ label, className = '', children, ...props }: SelectFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
