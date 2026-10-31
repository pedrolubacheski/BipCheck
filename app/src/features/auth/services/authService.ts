import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase.ts';
import { ServiceError } from '@/shared/errors.ts';

export type AuthUser = { id: string; email: string };

function toAuthUser(session: Session | null): AuthUser | null {
  if (!session) return null;
  return { id: session.user.id, email: session.user.email ?? '' };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ServiceError(error.message, error.code);
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new ServiceError(error.message, error.code);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new ServiceError(error.message, error.code);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getSession();
  return toAuthUser(data.session);
}

// Avisa quando a pessoa entra ou sai; devolve a função para parar de escutar
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    callback(toAuthUser(session)),
  );
  return () => data.subscription.unsubscribe();
}
