import { type FormEvent, useCallback, useState } from 'react';
import { useRequiredUser } from '@/features/auth/index.ts';
import { Button } from '@/shared/components/Button.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { useCurrentCompany } from './CompanyContext.ts';
import { addMember, listMembers, removeMember } from './services/companyService.ts';
import { type MemberRole, roleLabels } from './types.ts';

export function MembersPage() {
  const user = useRequiredUser();
  const company = useCurrentCompany();
  const load = useCallback(() => listMembers(company.companyId), [company.companyId]);
  const { data: members, loading, error, reload } = useAsyncData(load);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('driver');
  const add = useSubmit(addMember);
  const remove = useSubmit(removeMember);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (await add.submit(company.companyId, email.trim(), role)) {
      setEmail('');
      reload();
    }
  }

  async function handleRemove(memberId: string) {
    if (await remove.submit(memberId)) reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Equipe</PageTitle>
      <Panel title="Adicionar pessoa">
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            A pessoa precisa ter criado uma conta no BipCheck com este e-mail.
          </p>
          <TextField
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SelectField
            label="Papel"
            value={role}
            onChange={(e) => setRole(e.target.value as MemberRole)}
          >
            <option value="driver">{roleLabels.driver}</option>
            <option value="owner">{roleLabels.owner}</option>
          </SelectField>
          <ErrorMessage error={add.error} />
          <Button type="submit" disabled={add.submitting}>
            Adicionar
          </Button>
        </form>
      </Panel>
      <Panel title="Pessoas da empresa">
        {loading && !members && <LoadingMessage />}
        <ErrorMessage error={error ?? remove.error} />
        {members?.length === 0 && <EmptyMessage>Ninguém cadastrado.</EmptyMessage>}
        <ul className="divide-y divide-slate-100">
          {members?.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-2 py-2">
              <div>
                <p className="font-medium text-slate-800">{member.email}</p>
                <p className="text-sm text-slate-500">{roleLabels[member.role]}</p>
              </div>
              {member.userId !== user.id && (
                <Button
                  variant="secondary"
                  disabled={remove.submitting}
                  onClick={() => handleRemove(member.id)}
                >
                  Remover
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
