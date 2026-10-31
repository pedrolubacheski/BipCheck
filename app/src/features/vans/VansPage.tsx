import { type FormEvent, useCallback, useState } from 'react';
import { listMembers, useCurrentCompany } from '@/features/companies/index.ts';
import { Button } from '@/shared/components/Button.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import {
  assignDriver,
  createVan,
  deleteVan,
  listVanDrivers,
  listVans,
  unassignDriver,
} from './services/vanService.ts';

export function VansPage() {
  const { companyId } = useCurrentCompany();
  const load = useCallback(async () => {
    const [vans, drivers, members] = await Promise.all([
      listVans(companyId),
      listVanDrivers(companyId),
      listMembers(companyId),
    ]);
    return { vans, drivers, members };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [name, setName] = useState('');
  const create = useSubmit(createVan);
  const change = useSubmit(async (action: () => Promise<void>) => action());

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit(companyId, name.trim())) {
      setName('');
      reload();
    }
  }

  async function run(action: () => Promise<void>) {
    if (await change.submit(action)) reload();
  }

  const emailOf = (userId: string) => data?.members.find((m) => m.userId === userId)?.email ?? '—';

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Vans</PageTitle>
      <Panel title="Nova van">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <TextField
            label="Nome da van"
            placeholder="Ex.: Van Corbélia"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <ErrorMessage error={create.error} />
          <Button type="submit" disabled={create.submitting}>
            Cadastrar van
          </Button>
        </form>
      </Panel>

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error ?? change.error} />
      {data?.vans.length === 0 && <EmptyMessage>Nenhuma van cadastrada.</EmptyMessage>}

      {data?.vans.map((van) => {
        const vanDrivers = data.drivers.filter((d) => d.vanId === van.id);
        const available = data.members.filter(
          (m) => m.role === 'driver' && !vanDrivers.some((d) => d.userId === m.userId),
        );
        return (
          <Panel key={van.id} title={van.name}>
            <h3 className="text-sm font-medium text-slate-700">Motoristas</h3>
            {vanDrivers.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum motorista vinculado.</p>
            )}
            <ul className="mb-3 divide-y divide-slate-100">
              {vanDrivers.map((driver) => (
                <li key={driver.id} className="flex items-center justify-between py-2">
                  <span>{emailOf(driver.userId)}</span>
                  <Button
                    variant="secondary"
                    disabled={change.submitting}
                    onClick={() => run(() => unassignDriver(driver.id))}
                  >
                    Desvincular
                  </Button>
                </li>
              ))}
            </ul>
            {available.length > 0 && (
              <SelectField
                label="Vincular motorista"
                value=""
                disabled={change.submitting}
                onChange={(e) => run(() => assignDriver(companyId, van.id, e.target.value))}
              >
                <option value="">Escolha...</option>
                {available.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.email}
                  </option>
                ))}
              </SelectField>
            )}
            <Button
              variant="danger"
              className="mt-3"
              disabled={change.submitting}
              onClick={() => {
                if (confirm(`Apagar a ${van.name}? Os embarques dela também serão apagados.`)) {
                  void run(() => deleteVan(van.id));
                }
              }}
            >
              Apagar van
            </Button>
          </Panel>
        );
      })}
    </div>
  );
}
