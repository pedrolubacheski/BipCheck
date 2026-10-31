import { type FormEvent, useCallback, useState } from 'react';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { listVans } from '@/features/vans/index.ts';
import { formatDateTime } from '@/shared/dates.ts';
import { Button } from '@/shared/components/Button.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import {
  assignDeviceToVan,
  createDevice,
  deleteDevice,
  listDevices,
  rotateDeviceToken,
} from './services/deviceService.ts';

function TokenNotice({ token, onClose }: { token: string; onClose: () => void }) {
  return (
    <section aria-live="polite" className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900">Token do leitor (aparece só agora)</p>
      <p className="mt-1 text-sm text-amber-900">
        Copie para o <code>DEVICE_TOKEN</code> do arquivo <code>secrets.h</code> do firmware. Ele
        não será mostrado de novo. Não envie por mensagem nem coloque no Git.
      </p>
      <code className="mt-3 block break-all rounded bg-white p-2 text-sm">{token}</code>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(token)}>
          Copiar
        </Button>
        <Button onClick={onClose}>Já copiei</Button>
      </div>
    </section>
  );
}

export function DevicesPage() {
  const { companyId } = useCurrentCompany();
  const load = useCallback(async () => {
    const [devices, vans] = await Promise.all([listDevices(companyId), listVans(companyId)]);
    return { devices, vans };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [name, setName] = useState('');
  const [vanId, setVanId] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const create = useSubmit(async () =>
    setToken(await createDevice(companyId, name.trim(), vanId || null)),
  );
  const change = useSubmit(async (action: () => Promise<void>) => action());

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit()) {
      setName('');
      reload();
    }
  }

  async function run(action: () => Promise<void>) {
    if (await change.submit(action)) reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Leitores</PageTitle>
      {token && <TokenNotice token={token} onClose={() => setToken(null)} />}

      <Panel title="Novo leitor">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <TextField
            label="Nome do leitor"
            placeholder="Ex.: Leitor da porta"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <SelectField label="Van" value={vanId} onChange={(e) => setVanId(e.target.value)}>
            <option value="">Sem van por enquanto</option>
            {data?.vans.map((van) => (
              <option key={van.id} value={van.id}>
                {van.name}
              </option>
            ))}
          </SelectField>
          <ErrorMessage error={create.error} />
          <Button type="submit" disabled={create.submitting}>
            Cadastrar leitor
          </Button>
        </form>
      </Panel>

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error ?? change.error} />
      {data?.devices.length === 0 && <EmptyMessage>Nenhum leitor cadastrado.</EmptyMessage>}

      {data?.devices.map((device) => (
        <Panel key={device.id} title={device.name}>
          <p className="mb-3 text-sm text-slate-500">
            Último sinal: {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : 'nunca'}
          </p>
          <SelectField
            label="Van"
            value={device.vanId ?? ''}
            disabled={change.submitting}
            onChange={(e) => run(() => assignDeviceToVan(device.id, e.target.value || null))}
          >
            <option value="">Sem van</option>
            {data.vans.map((van) => (
              <option key={van.id} value={van.id}>
                {van.name}
              </option>
            ))}
          </SelectField>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={change.submitting}
              onClick={() => {
                if (
                  confirm('Trocar o token? O leitor para de funcionar até receber o token novo.')
                ) {
                  void run(async () => setToken(await rotateDeviceToken(device.id)));
                }
              }}
            >
              Trocar token
            </Button>
            <Button
              variant="danger"
              disabled={change.submitting}
              onClick={() => {
                if (confirm(`Apagar o leitor ${device.name}?`))
                  void run(() => deleteDevice(device.id));
              }}
            >
              Apagar
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}
