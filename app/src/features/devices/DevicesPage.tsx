import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { listVans } from '@/features/vans/index.ts';
import { Badge } from '@/shared/components/Badge.tsx';
import { Button } from '@/shared/components/Button.tsx';
import { type Confirmation, ConfirmDialog } from '@/shared/components/ConfirmDialog.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { IconAlert, IconCheck, IconPlus, IconReader } from '@/shared/components/icons.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { formatDateTime } from '@/shared/dates.ts';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { useToast } from '@/shared/toast/ToastContext.ts';
import {
  assignDeviceToVan,
  createDevice,
  deleteDevice,
  listDevices,
  rotateDeviceToken,
} from './services/deviceService.ts';

type CopyState = 'idle' | 'copied' | 'failed';

function TokenNotice({ token, onClose }: { token: string; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');

  // O token aparece uma vez só: leva a tela até ele para não passar despercebido
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'start' });
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(token).then(
      () => setCopyState('copied'),
      () => setCopyState('failed'),
    );
  }

  return (
    <section
      ref={ref}
      aria-live="polite"
      className="flex scroll-mt-24 flex-col gap-3 rounded-2xl border-2 border-amber-600 bg-amber-50 p-4 text-amber-950"
    >
      <h2 className="flex items-start gap-2 text-xl font-bold">
        <IconAlert className="mt-0.5 size-6" />
        Copie o código do leitor agora
      </h2>
      <p>
        Ele aparece <strong>só desta vez</strong>. Cole no <code>DEVICE_TOKEN</code> do arquivo{' '}
        <code>secrets.h</code> do leitor. Não envie por mensagem.
      </p>
      <code className="block rounded-xl bg-white p-3 text-base break-all select-all">{token}</code>
      {copyState === 'copied' && (
        <output className="flex items-center gap-2 font-semibold text-emerald-900">
          <IconCheck className="size-5" />
          Código copiado.
        </output>
      )}
      {copyState === 'failed' && (
        <p role="alert" className="font-semibold">
          Não deu para copiar sozinho. Segure o dedo sobre o código acima e escolha “Copiar”.
        </p>
      )}
      <Button onClick={handleCopy}>Copiar código</Button>
      <Button variant="secondary" onClick={onClose}>
        Já copiei, pode esconder
      </Button>
    </section>
  );
}

export function DevicesPage() {
  const { companyId } = useCurrentCompany();
  const toast = useToast();
  const load = useCallback(async () => {
    const [devices, vans] = await Promise.all([listDevices(companyId), listVans(companyId)]);
    return { devices, vans };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [formOpen, setFormOpen] = useState<boolean>();
  const [name, setName] = useState('');
  const [vanId, setVanId] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const create = useSubmit(async () =>
    setToken(await createDevice(companyId, name.trim(), vanId || null)),
  );
  const change = useSubmit(async (action: () => Promise<void>) => action());

  // Sem nenhum leitor, o formulário já aparece aberto: é o próximo passo óbvio
  const isEmpty = data?.devices.length === 0;
  const showForm = formOpen ?? isEmpty;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit()) {
      setName('');
      setFormOpen(false);
      toast('Leitor cadastrado.');
      reload();
    }
  }

  async function run(action: () => Promise<void>, successMessage: string) {
    if (await change.submit(action)) {
      toast(successMessage);
      reload();
    }
  }

  return (
    <>
      <PageTitle description="Os aparelhos da porta da van, onde o aluno encosta o cartão.">
        Leitores
      </PageTitle>

      {token && <TokenNotice key={token} token={token} onClose={() => setToken(null)} />}

      {showForm ? (
        <Panel title="Novo leitor">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <TextField
              label="Nome do leitor"
              placeholder="Ex.: Leitor da porta"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <SelectField
              label="Em qual van ele fica"
              value={vanId}
              onChange={(e) => setVanId(e.target.value)}
            >
              <option value="">Ainda não sei</option>
              {data?.vans.map((van) => (
                <option key={van.id} value={van.id}>
                  {van.name}
                </option>
              ))}
            </SelectField>
            <ErrorMessage error={create.error} />
            <Button type="submit" loading={create.submitting} loadingLabel="Cadastrando...">
              Cadastrar leitor
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
            Cadastrar leitor
          </Button>
        )
      )}

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={change.error} />

      {isEmpty && (
        <EmptyMessage title="Nenhum leitor cadastrado" icon={<IconReader className="size-10" />}>
          Preencha o nome acima para cadastrar o primeiro.
        </EmptyMessage>
      )}

      {data?.devices.map((device) => (
        <Panel key={device.id} title={device.name}>
          <div className="flex flex-col gap-4">
            {device.lastSeenAt ? (
              <p className="text-slate-700">
                Último sinal: <strong>{formatDateTime(device.lastSeenAt)}</strong>
              </p>
            ) : (
              <p>
                <Badge tone="warning">Ainda não conectou</Badge>
              </p>
            )}
            <SelectField
              label="Van deste leitor"
              value={device.vanId ?? ''}
              disabled={change.submitting}
              onChange={(e) =>
                run(
                  () => assignDeviceToVan(device.id, e.target.value || null),
                  'Van do leitor alterada.',
                )
              }
            >
              <option value="">Sem van (não registra embarques)</option>
              {data.vans.map((van) => (
                <option key={van.id} value={van.id}>
                  {van.name}
                </option>
              ))}
            </SelectField>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="secondary"
                size="md"
                disabled={change.submitting}
                onClick={() =>
                  setConfirmation({
                    title: 'Gerar um código novo?',
                    description:
                      'Use se o leitor foi perdido ou roubado. O leitor para de funcionar até receber o código novo.',
                    confirmLabel: 'Gerar código novo',
                    onConfirm: () =>
                      void run(
                        async () => setToken(await rotateDeviceToken(device.id)),
                        'Código novo gerado.',
                      ),
                  })
                }
              >
                Gerar código novo
              </Button>
              <Button
                variant="dangerOutline"
                size="md"
                disabled={change.submitting}
                onClick={() =>
                  setConfirmation({
                    title: `Apagar o leitor ${device.name}?`,
                    description: 'Ele para de registrar embarques. Não dá para desfazer.',
                    confirmLabel: 'Apagar leitor',
                    danger: true,
                    onConfirm: () => void run(() => deleteDevice(device.id), 'Leitor apagado.'),
                  })
                }
              >
                Apagar leitor
              </Button>
            </div>
          </div>
        </Panel>
      ))}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}
