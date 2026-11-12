import { createContext, useContext } from 'react';

// Mostra um aviso rápido de que a ação deu certo (ex.: "Aluno cadastrado.")
export const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
