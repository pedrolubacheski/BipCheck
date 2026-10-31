// Mensagens de estado padronizadas: carregando, erro e lista vazia
import { toUserMessage } from '../errors.ts';

export function LoadingMessage() {
  return <p className="py-6 text-center text-slate-500">Carregando...</p>;
}

export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {toUserMessage(error)}
    </p>
  );
}

export function EmptyMessage({ children }: { children: string }) {
  return <p className="py-6 text-center text-slate-500">{children}</p>;
}
