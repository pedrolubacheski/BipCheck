import { type ReactNode, useEffect, useState } from 'react';
import { AuthContext, type AuthState } from './AuthContext.ts';
import { getCurrentUser, onAuthChange } from './services/authService.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    getCurrentUser()
      .then((user) => setState({ user, loading: false }))
      .catch(() => setState({ user: null, loading: false }));
    return onAuthChange((user) => setState({ user, loading: false }));
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}
