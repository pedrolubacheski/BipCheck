import type { ReactNode } from 'react';

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {title && <h2 className="mb-3 text-lg font-semibold text-slate-800">{title}</h2>}
      {children}
    </section>
  );
}

export function PageTitle({ children }: { children: string }) {
  return <h1 className="text-2xl font-bold text-slate-900">{children}</h1>;
}
