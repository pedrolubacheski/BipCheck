import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'neutral';

const toneClasses: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-900',
  warning: 'bg-amber-100 text-amber-900',
  neutral: 'bg-slate-200 text-slate-800',
};

// Etiqueta de situação. O texto sempre diz a situação: a cor é só um reforço.
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-base font-semibold whitespace-nowrap ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
