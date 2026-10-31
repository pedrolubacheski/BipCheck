import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/components/Button.tsx';
import { ErrorMessage } from '@/shared/components/Feedback.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { signIn, signUp } from './services/authService.ts';

export function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedUp, setSignedUp] = useState(false);
  const { submit, submitting, error } = useSubmit(mode === 'signIn' ? signIn : signUp);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await submit(email.trim(), password);
    if (ok && mode === 'signUp') setSignedUp(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow"
      >
        <h1 className="text-center text-2xl font-bold text-emerald-700">BipCheck</h1>
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorMessage error={error} />
        {signedUp && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Conta criada. Se pedirmos confirmação, verifique seu e-mail e depois entre.
          </p>
        )}
        <Button type="submit" disabled={submitting}>
          {mode === 'signIn' ? 'Entrar' : 'Criar conta'}
        </Button>
        <button
          type="button"
          className="text-sm text-emerald-700 underline"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        >
          {mode === 'signIn' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </main>
  );
}
