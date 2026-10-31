// Padrão dos hooks de dados: chama um service e expõe { data, loading, error, reload }
import { useCallback, useEffect, useState } from 'react';

export type AsyncData<T> = {
  data: T | undefined;
  loading: boolean;
  error: unknown;
  reload: () => void;
};

type Result<T> = {
  load: () => Promise<T>;
  version: number;
  data: T | undefined;
  error: unknown;
};

// load deve ser estável (useCallback): ele muda quando os parâmetros da busca mudam.
// Enquanto recarrega, mantém os dados anteriores na tela.
export function useAsyncData<T>(load: () => Promise<T>): AsyncData<T> {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setResult({ load, version, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setResult((prev) => ({ load, version, data: prev?.data, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = result?.load !== load || result.version !== version;

  return { data: result?.data, loading, error: result?.error ?? null, reload };
}
