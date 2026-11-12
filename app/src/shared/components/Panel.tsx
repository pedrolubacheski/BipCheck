import type { ReactNode } from 'react';

export function Panel({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {title && <h2 className="mb-3 text-xl font-bold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

// Título da tela, com uma frase opcional explicando para que ela serve
export function PageTitle({ children, description }: { children: string; description?: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{children}</h1>
      {description && <p className="mt-1 text-slate-700">{description}</p>}
    </div>
  );
}
