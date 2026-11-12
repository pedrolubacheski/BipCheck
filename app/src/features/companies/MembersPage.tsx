import { type FormEvent, useCallback, useState } from 'react';
import { useRequiredUser } from '@/features/auth/index.ts';
import { Badge } from '@/shared/components/Badge.tsx';
import { Button } from '@/shared/components/Button.tsx';
import { type Confirmation, ConfirmDialog } from '@/shared/components/ConfirmDialog.tsx';
import { ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { IconPlus } from '@/shared/components/icons.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { useToast } from '@/shared/toast/ToastContext.ts';
import { useCurrentCompany } from './CompanyContext.ts';
import { addMember, listMembers, removeMember } from './services/companyService.ts';
import { type MemberRole, roleLabels } from './types.ts';

export function MembersPage() {
  const user = useRequiredUser();
  const company = useCurrentCompany();
  const toast = useToast();
  const load = useCallback(() => listMembers(company.companyId), [company.companyId]);
  const { data: members, loading, error, reload } = useAsyncData(load);

  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('driver');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const add = useSubmit(addMember);
  const remove = useSubmit(removeMember);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (await add.submit(company.companyId, email.trim(), role)) {
      setEmail('');
      setFormOpen(false);
      toast('Pessoa adicionada à equipe.');
      reload();
    }
  }

  async function handleRemove(memberId: string) {
    if (await remove.submit(memberId)) {
      toast('Pessoa removida da equipe.');
      reload();
    }
  }

  return (
    <>
      <PageTitle description="Quem pode usar o BipCheck na sua empresa.">Equipe</PageTitle>

      {formOpen ? (
        <Panel title="Adicionar pessoa">
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <TextField
              label="E-mail da pessoa"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              hint="Ela precisa já ter criado a conta no BipCheck com este e-mail."
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <SelectField
              label="O que ela faz"
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
            >
              <option value="driver">{roleLabels.driver} (vê os embarques da van dele)</option>
              <option value="owner">{roleLabels.owner} (vê e cadastra tudo)</option>
            </SelectField>
            <ErrorMessage error={add.error} />
            <Button type="submit" loading={add.submitting} loadingLabel="Adicionando...">
              Adicionar à equipe
            </Button>
            <Button
              variant="secondary"
              disabled={add.submitting}
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
          </form>
        </Panel>
      ) : (
        <Button icon={<IconPlus />} onClick={() => setFormOpen(true)}>
          Adicionar pessoa
        </Button>
      )}

      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={remove.error} />

      <Panel title="Pessoas da empresa">
        {loading && !members && <LoadingMessage />}
        <ul className="divide-y divide-slate-200">
          {members?.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-lg font-semibold break-all">{member.email}</p>
                <Badge tone={member.role === 'owner' ? 'success' : 'neutral'}>
                  {roleLabels[member.role]}
                  {member.userId === user.id && ' (você)'}
                </Badge>
              </div>
              {member.userId !== user.id && (
                <Button
                  variant="dangerOutline"
                  size="md"
                  disabled={remove.submitting}
                  onClick={() =>
                    setConfirmation({
                      title: 'Remover da equipe?',
                      description: `${member.email} não vai mais conseguir ver os dados da empresa.`,
                      confirmLabel: 'Remover',
                      danger: true,
                      onConfirm: () => void handleRemove(member.id),
                    })
                  }
                >
                  Remover da equipe
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}
