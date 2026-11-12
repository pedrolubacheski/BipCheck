import { type FormEvent, useCallback, useState } from 'react';
import { listMembers, useCurrentCompany } from '@/features/companies/index.ts';
import { Button } from '@/shared/components/Button.tsx';
import { type Confirmation, ConfirmDialog } from '@/shared/components/ConfirmDialog.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { IconPlus, IconVan } from '@/shared/components/icons.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { useToast } from '@/shared/toast/ToastContext.ts';
import {
  assignDriver,
  createVan,
  deleteVan,
  listVanDrivers,
  listVans,
  unassignDriver,
} from './services/vanService.ts';

type DriverOption = { userId: string; email: string };

// Escolher o motorista e confirmar no botão: nada acontece só por abrir a lista
function AssignDriverForm({
  options,
  busy,
  onAssign,
}: {
  options: DriverOption[];
  busy: boolean;
  onAssign: (userId: string) => void;
}) {
  const [userId, setUserId] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onAssign(userId);
    setUserId('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <SelectField
        label="Colocar motorista nesta van"
        required
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      >
        <option value="">Escolha o motorista</option>
        {options.map((option) => (
          <option key={option.userId} value={option.userId}>
            {option.email}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" size="md" disabled={busy}>
        Colocar na van
      </Button>
    </form>
  );
}

export function VansPage() {
  const { companyId } = useCurrentCompany();
  const toast = useToast();
  const load = useCallback(async () => {
    const [vans, drivers, members] = await Promise.all([
      listVans(companyId),
      listVanDrivers(companyId),
      listMembers(companyId),
    ]);
    return { vans, drivers, members };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [formOpen, setFormOpen] = useState<boolean>();
  const [name, setName] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const create = useSubmit(createVan);
  const change = useSubmit(async (action: () => Promise<void>) => action());

  // Sem nenhuma van, o formulário já aparece aberto: é o próximo passo óbvio
  const isEmpty = data?.vans.length === 0;
  const showForm = formOpen ?? isEmpty;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit(companyId, name.trim())) {
      setName('');
      setFormOpen(false);
      toast('Van cadastrada.');
      reload();
    }
  }

  async function run(action: () => Promise<void>, successMessage: string) {
    if (await change.submit(action)) {
      toast(successMessage);
      reload();
    }
  }

  const emailOf = (userId: string) => data?.members.find((m) => m.userId === userId)?.email ?? '—';
  const companyHasDrivers = data?.members.some((m) => m.role === 'driver') ?? false;

  return (
    <>
      <PageTitle description="As vans da empresa e os motoristas de cada uma.">Vans</PageTitle>

      {showForm ? (
        <Panel title="Nova van">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <TextField
              label="Nome da van"
              placeholder="Ex.: Van Corbélia"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <ErrorMessage error={create.error} />
            <Button type="submit" loading={create.submitting} loadingLabel="Cadastrando...">
              Cadastrar van
            </Button>
            {!isEmpty && (
              <Button
                variant="secondary"
                disabled={create.submitting}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
            )}
          </form>
        </Panel>
      ) : (
        data && (
          <Button icon={<IconPlus />} onClick={() => setFormOpen(true)}>
            Cadastrar van
          </Button>
        )
      )}

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={change.error} />

      {isEmpty && (
        <EmptyMessage title="Nenhuma van cadastrada" icon={<IconVan className="size-10" />}>
          Preencha o nome acima para cadastrar a primeira.
        </EmptyMessage>
      )}

      {data?.vans.map((van) => {
        const vanDrivers = data.drivers.filter((d) => d.vanId === van.id);
        const available = data.members.filter(
          (m) => m.role === 'driver' && !vanDrivers.some((d) => d.userId === m.userId),
        );
        return (
          <Panel key={van.id} title={van.name}>
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Motoristas desta van</h3>
                {vanDrivers.length === 0 && (
                  <p className="mt-1 text-slate-700">
                    Nenhum motorista ainda. Sem motorista, ninguém acompanha os embarques dela pelo
                    celular.
                  </p>
                )}
                <ul className="divide-y divide-slate-200">
                  {vanDrivers.map((driver) => (
                    <li key={driver.id} className="flex flex-col gap-2 py-3">
                      <span className="text-lg font-semibold break-all">
                        {emailOf(driver.userId)}
                      </span>
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={change.submitting}
                        onClick={() =>
                          run(() => unassignDriver(driver.id), 'Motorista tirado da van.')
                        }
                      >
                        Tirar da van
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              {available.length > 0 && (
                <AssignDriverForm
                  options={available}
                  busy={change.submitting}
                  onAssign={(userId) =>
                    void run(
                      () => assignDriver(companyId, van.id, userId),
                      'Motorista colocado na van.',
                    )
                  }
                />
              )}
              {!companyHasDrivers && (
                <p className="rounded-xl bg-slate-100 p-3 text-base text-slate-800">
                  Para colocar um motorista aqui, primeiro adicione ele em <strong>Equipe</strong>.
                </p>
              )}

              <Button
                variant="dangerOutline"
                size="md"
                disabled={change.submitting}
                onClick={() =>
                  setConfirmation({
                    title: `Apagar a ${van.name}?`,
                    description:
                      'Os embarques registrados nesta van também serão apagados. Não dá para desfazer.',
                    confirmLabel: 'Apagar van',
                    danger: true,
                    onConfirm: () => void run(() => deleteVan(van.id), 'Van apagada.'),
                  })
                }
              >
                Apagar van
              </Button>
            </div>
          </Panel>
        );
      })}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}
