import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/components/Button.tsx';
import { ErrorMessage } from '@/shared/components/Feedback.tsx';
import { Panel } from '@/shared/components/Panel.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { createCompany } from './services/companyService.ts';

export function CreateCompanyPage({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const { submit, submitting, error } = useSubmit(createCompany);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (await submit(name.trim())) onCreated();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <Panel title="Bem-vindo ao BipCheck">
        <p className="mb-4 text-sm text-slate-600">
          Se você é <strong>motorista</strong>, peça ao dono da frota para adicionar seu e-mail na
          empresa. Se você é o <strong>dono</strong>, crie sua empresa:
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            label="Nome da empresa"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <ErrorMessage error={error} />
          <Button type="submit" disabled={submitting}>
            Criar empresa
          </Button>
        </form>
      </Panel>
    </main>
  );
}
