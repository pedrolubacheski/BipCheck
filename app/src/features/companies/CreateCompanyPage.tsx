import { type FormEvent, useState } from 'react';
import { SignOutButton } from '@/features/auth/index.ts';
import { Button } from '@/shared/components/Button.tsx';
import { ErrorMessage } from '@/shared/components/Feedback.tsx';
import { IconRefresh } from '@/shared/components/icons.tsx';
import { Panel } from '@/shared/components/Panel.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { createCompany } from './services/companyService.ts';

type CreateCompanyPageProps = {
  email: string;
  // Está conferindo de novo se a pessoa já foi adicionada a uma empresa
  checking: boolean;
  onChanged: () => void;
};

// Primeira tela de quem ainda não está em nenhuma empresa: um caminho para o motorista, outro para o dono
export function CreateCompanyPage({ email, checking, onChanged }: CreateCompanyPageProps) {
  const [name, setName] = useState('');
  const { submit, submitting, error } = useSubmit(createCompany);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (await submit(name.trim())) onChanged();
  }

  return (
    <main className="animate-rise mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Bem-vindo ao BipCheck</h1>
        <SignOutButton className="border-2 border-slate-400 bg-white text-slate-900" />
      </div>

      <Panel title="Sou motorista">
        <div className="flex flex-col gap-4">
          <p className="text-slate-700">
            Peça ao dono da frota para adicionar este e-mail na equipe da empresa:
          </p>
          <p className="rounded-xl bg-slate-100 p-3 text-lg font-semibold break-all">{email}</p>
          <p className="text-slate-700">Depois que ele adicionar, toque no botão abaixo.</p>
          <Button
            variant="secondary"
            icon={<IconRefresh className="size-5" />}
            loading={checking}
            loadingLabel="Verificando..."
            onClick={onChanged}
          >
            Já fui adicionado
          </Button>
        </div>
      </Panel>

      <Panel title="Sou dono da frota">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            label="Nome da empresa"
            placeholder="Ex.: Transportes Silva"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <ErrorMessage error={error} />
          <Button type="submit" loading={submitting} loadingLabel="Criando...">
            Criar empresa
          </Button>
        </form>
      </Panel>
    </main>
  );
}
