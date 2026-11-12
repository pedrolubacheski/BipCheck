import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/components/Button.tsx';
import { ErrorMessage } from '@/shared/components/Feedback.tsx';
import { IconCheck } from '@/shared/components/icons.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { signIn, signUp } from './services/authService.ts';

type Mode = 'signIn' | 'signUp';

const copy: Record<Mode, { title: string; submit: string; submitting: string; switchTo: string }> =
  {
    signIn: {
      title: 'Entrar',
      submit: 'Entrar',
      submitting: 'Entrando...',
      switchTo: 'Ainda não tenho conta',
    },
    signUp: {
      title: 'Criar conta',
      submit: 'Criar minha conta',
      submitting: 'Criando a conta...',
      switchTo: 'Já tenho conta',
    },
  };

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const { submit, submitting, error } = useSubmit(mode === 'signIn' ? signIn : signUp);
  const text = copy[mode];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSignedUp(false);
    const ok = await submit(email.trim(), password);
    if (ok && mode === 'signUp') {
      setSignedUp(true);
      setMode('signIn');
    }
  }

  return (
    <main className="animate-rise mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <img
          src="/icon-192.png"
          alt=""
          width="64"
          height="64"
          className="size-16 rounded-2xl shadow-md"
        />
        <div>
          <p className="text-3xl font-bold text-emerald-800">BipCheck</p>
          <p className="text-slate-700">Embarque dos alunos na van</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5"
      >
        <h1 className="text-2xl font-bold">{text.title}</h1>
        {signedUp && (
          <output className="flex items-start gap-3 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4 font-medium text-emerald-900">
            <IconCheck className="mt-0.5 size-6" />
            Conta criada. Agora toque em Entrar. Se não entrar, abra o e-mail que enviamos e
            confirme a conta.
          </output>
        )}
        <TextField
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nome@exemplo.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          minLength={mode === 'signUp' ? 8 : undefined}
          hint={mode === 'signUp' ? 'Escolha uma senha com pelo menos 8 caracteres.' : undefined}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          action={
            <button
              type="button"
              aria-pressed={showPassword}
              className="min-h-11 rounded-lg px-3 text-base font-semibold text-emerald-800 hover:bg-emerald-50"
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          }
        />
        <ErrorMessage error={error} />
        <Button type="submit" loading={submitting} loadingLabel={text.submitting}>
          {text.submit}
        </Button>
        <Button
          variant="secondary"
          disabled={submitting}
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
        >
          {text.switchTo}
        </Button>
      </form>
    </main>
  );
}
