import { createContext, useContext } from 'react';
import type { AuthUser } from './services/authService.ts';

export type AuthState = { user: AuthUser | null; loading: boolean };

export const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

// Para telas que só existem com alguém logado
export function useRequiredUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error('useRequiredUser usado fora de uma rota protegida');
  return user;
}
