import { type InputHTMLAttributes, useId } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, className = '', ...props }: TextFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        {...props}
      />
    </div>
  );
}
