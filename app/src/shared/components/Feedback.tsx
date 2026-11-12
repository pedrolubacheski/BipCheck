// Mensagens de estado padronizadas: carregando, erro e lista vazia
import type { ReactNode } from 'react';
import { toUserMessage } from '../errors.ts';
import { Button } from './Button.tsx';
import { IconAlert, IconRefresh } from './icons.tsx';
import { Spinner } from './Spinner.tsx';

export function LoadingMessage({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <output
      className={`flex items-center justify-center gap-3 text-slate-700 ${fullScreen ? 'min-h-dvh' : 'py-8'}`}
    >
      <Spinner className="size-6 text-emerald-700" />
      Carregando...
    </output>
  );
}

// onRetry: mostra o botão "Tentar de novo" (para erros de carregamento)
export function ErrorMessage({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border-2 border-red-700 bg-red-50 p-4 text-red-900"
    >
      <p className="flex items-start gap-3 font-medium">
        <IconAlert className="mt-0.5 size-6" />
        {toUserMessage(error)}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          icon={<IconRefresh className="size-5" />}
          onClick={onRetry}
        >
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

// Lista vazia: diz o que está faltando e qual é o próximo passo
export function EmptyMessage({
  children,
  title,
  icon,
}: {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-col items-center gap-2 px-2 py-8 text-center">
      {icon && <span className="text-slate-500">{icon}</span>}
      {title && <p className="text-xl font-bold text-slate-900">{title}</p>}
      <p className="text-slate-700">{children}</p>
    </div>
  );
}
