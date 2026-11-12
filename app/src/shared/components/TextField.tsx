import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  // Explicação curta abaixo do campo
  hint?: string;
  // Botão dentro do campo (ex.: "Mostrar" a senha)
  action?: ReactNode;
};

export function TextField({ label, hint, action, className = '', ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-base font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          className={`min-h-14 w-full rounded-xl border-2 border-slate-400 bg-white px-4 text-lg text-slate-900 placeholder:text-slate-500 transition-shadow focus:border-emerald-700 focus:ring-4 focus:ring-emerald-200 focus:outline-none ${action ? 'pr-28' : ''}`}
          {...props}
        />
        {action && <div className="absolute inset-y-1 right-1 flex items-center">{action}</div>}
      </div>
      {hint && (
        <p id={hintId} className="text-base text-slate-600">
          {hint}
        </p>
      )}
    </div>
  );
}
