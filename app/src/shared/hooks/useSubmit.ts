// Padrão dos formulários: executa a ação, guarda o erro e indica se está enviando
import { useCallback, useState } from 'react';

export function useSubmit<Args extends unknown[]>(action: (...args: Args) => Promise<unknown>) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = useCallback(
    async (...args: Args): Promise<boolean> => {
      setSubmitting(true);
      setError(null);
      try {
        await action(...args);
        return true;
      } catch (err) {
        setError(err);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [action],
  );

  return { submit, submitting, error };
}
