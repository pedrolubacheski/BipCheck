import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { IconCheck } from '../components/icons.tsx';
import { ToastContext } from './ToastContext.ts';

const VISIBLE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const show = useCallback(
    (message: string) => setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message })),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      {/* A região fica sempre na tela para o leitor de tela anunciar o aviso quando ele chega */}
      <output className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-8">
        {toast && (
          <span
            key={toast.id}
            className="animate-rise flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-4 font-semibold text-white shadow-xl"
          >
            <IconCheck className="size-6 text-emerald-400" />
            {toast.message}
          </span>
        )}
      </output>
    </ToastContext>
  );
}
