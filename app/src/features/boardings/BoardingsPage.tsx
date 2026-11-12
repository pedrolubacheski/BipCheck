import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { useRequiredUser } from '@/features/auth/index.ts';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { listVansForUser, type Van } from '@/features/vans/index.ts';
import { Button } from '@/shared/components/Button.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { IconAlert, IconRefresh, IconVan } from '@/shared/components/icons.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { formatLongDate, formatTime } from '@/shared/dates.ts';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useOnline } from '@/shared/hooks/useOnline.ts';
import { BoardingList } from './components/BoardingList.tsx';
import { useVanBoardings } from './hooks/useVanBoardings.ts';

// Até aqui cabem botões grandes lado a lado; com mais vans, vira uma lista de escolha
const MAX_VAN_BUTTONS = 4;

function VanBoardings({ vanId }: { vanId: string }) {
  const { boardings, loading, error, reload, connected, latest } = useVanBoardings(vanId);
  const online = useOnline();
  const firstLoad = loading && boardings.length === 0;
  const live = connected === true && online;
  const count = boardings.length;

  return (
    <>
      <section
        aria-label="Resumo de hoje"
        className="flex flex-col gap-3 rounded-2xl bg-linear-to-br from-emerald-700 to-emerald-900 p-5 text-white shadow-lg shadow-emerald-900/25"
      >
        <p className="flex items-center gap-4">
          <span
            key={count}
            className="animate-pop inline-block text-7xl leading-none font-bold tabular-nums"
          >
            {firstLoad ? '–' : count}
          </span>
          <span className="text-2xl leading-tight font-semibold">
            {count === 1 ? 'aluno embarcou hoje' : 'alunos embarcaram hoje'}
          </span>
        </p>
        {connected === null && online ? (
          <p className="text-base text-emerald-50">Conectando ao vivo...</p>
        ) : live ? (
          <p className="flex items-center gap-2 text-base text-emerald-50">
            <span aria-hidden="true" className="relative flex size-3 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-300" />
            </span>
            Ao vivo: cada embarque aparece sozinho, com um bip.
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-amber-200 p-3 text-base font-semibold text-amber-950">
            <IconAlert className="mt-0.5 size-5" />
            Sem atualização ao vivo agora. Toque em “Atualizar” para conferir.
          </p>
        )}
      </section>

      {/* Leitor de tela anuncia cada embarque que chega */}
      <output className="sr-only">
        {latest && `${latest.studentName} embarcou às ${formatTime(latest.boardedAt)}`}
      </output>

      <ErrorMessage error={error} onRetry={reload} />

      <Panel>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-xl font-bold whitespace-nowrap text-slate-900">Quem embarcou</h2>
          <Button
            variant="secondary"
            size="md"
            icon={<IconRefresh className="size-5" />}
            loading={loading}
            loadingLabel="Atualizando..."
            onClick={reload}
          >
            Atualizar
          </Button>
        </div>
        {firstLoad ? (
          <LoadingMessage />
        ) : (
          <BoardingList boardings={boardings} highlightId={latest?.id} />
        )}
      </Panel>
    </>
  );
}

function VanPicker({
  vans,
  vanId,
  onSelect,
}: {
  vans: Van[];
  vanId: string;
  onSelect: (vanId: string) => void;
}) {
  if (vans.length > MAX_VAN_BUTTONS) {
    return (
      <SelectField label="Qual van?" value={vanId} onChange={(e) => onSelect(e.target.value)}>
        {vans.map((van) => (
          <option key={van.id} value={van.id}>
            {van.name}
          </option>
        ))}
      </SelectField>
    );
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-base font-semibold text-slate-800">Qual van?</legend>
      <div className="grid grid-cols-2 gap-2">
        {vans.map((van) => {
          const selected = van.id === vanId;
          return (
            <button
              key={van.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(van.id)}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-3 text-lg font-semibold break-words transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${selected ? 'border-emerald-700 bg-emerald-100 text-emerald-900 shadow-sm' : 'border-slate-400 bg-white text-slate-800'}`}
            >
              <IconVan className="size-5" />
              {van.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BoardingsPage() {
  const user = useRequiredUser();
  const { companyId, role } = useCurrentCompany();
  const load = useCallback(
    () => listVansForUser(companyId, user.id, role === 'owner'),
    [companyId, user.id, role],
  );
  const { data: vans, loading, error, reload } = useAsyncData(load);
  const [selectedVanId, setSelectedVanId] = useState<string>();

  const vanId = selectedVanId ?? vans?.[0]?.id;
  const today = formatLongDate();

  return (
    <>
      <PageTitle description={today.charAt(0).toUpperCase() + today.slice(1)}>Embarques</PageTitle>
      {loading && !vans && <LoadingMessage />}
      <ErrorMessage error={error} onRetry={reload} />

      {vans?.length === 0 &&
        (role === 'owner' ? (
          <Panel>
            <EmptyMessage title="Nenhuma van cadastrada" icon={<IconVan className="size-10" />}>
              Cadastre a primeira van para acompanhar os embarques.
            </EmptyMessage>
            <Link
              to="/vans"
              className="flex min-h-14 items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-semibold text-white shadow-md shadow-emerald-900/20 transition-[background-color,transform] duration-150 hover:bg-emerald-800 active:scale-[0.97]"
            >
              Cadastrar van
            </Link>
          </Panel>
        ) : (
          <Panel className="flex flex-col">
            <EmptyMessage title="Você ainda não tem uma van" icon={<IconVan className="size-10" />}>
              Peça ao dono da frota para ligar você a uma van. Depois toque no botão abaixo.
            </EmptyMessage>
            <Button
              variant="secondary"
              icon={<IconRefresh className="size-5" />}
              loading={loading}
              loadingLabel="Verificando..."
              onClick={reload}
            >
              Verificar de novo
            </Button>
          </Panel>
        ))}

      {vans && vans.length > 1 && vanId && (
        <VanPicker vans={vans} vanId={vanId} onSelect={setSelectedVanId} />
      )}
      {vans?.length === 1 && (
        <p className="flex items-center gap-2 text-xl font-semibold text-slate-800">
          <IconVan className="size-6 text-emerald-800" />
          {vans[0]!.name}
        </p>
      )}
      {vanId && <VanBoardings key={vanId} vanId={vanId} />}
    </>
  );
}
