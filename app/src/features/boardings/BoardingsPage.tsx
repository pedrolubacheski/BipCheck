import { useCallback, useState } from 'react';
import { useRequiredUser } from '@/features/auth/index.ts';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { listVansForUser } from '@/features/vans/index.ts';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { BoardingList } from './components/BoardingList.tsx';
import { useVanBoardings } from './hooks/useVanBoardings.ts';

function VanBoardings({ vanId }: { vanId: string }) {
  const { boardings, loading, error } = useVanBoardings(vanId);

  return (
    <Panel title={`Embarcaram hoje: ${boardings.length}`}>
      {loading && boardings.length === 0 && <LoadingMessage />}
      <ErrorMessage error={error} />
      {!loading && <BoardingList boardings={boardings} />}
    </Panel>
  );
}

export function BoardingsPage() {
  const user = useRequiredUser();
  const { companyId, role } = useCurrentCompany();
  const load = useCallback(
    () => listVansForUser(companyId, user.id, role === 'owner'),
    [companyId, user.id, role],
  );
  const { data: vans, loading, error } = useAsyncData(load);
  const [selectedVanId, setSelectedVanId] = useState<string>();

  const vanId = selectedVanId ?? vans?.[0]?.id;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Embarques</PageTitle>
      {loading && !vans && <LoadingMessage />}
      <ErrorMessage error={error} />
      {vans?.length === 0 && (
        <EmptyMessage>
          {role === 'owner'
            ? 'Cadastre uma van para acompanhar os embarques.'
            : 'Você ainda não está vinculado a nenhuma van. Fale com o dono da frota.'}
        </EmptyMessage>
      )}
      {vans && vans.length > 1 && (
        <SelectField label="Van" value={vanId} onChange={(e) => setSelectedVanId(e.target.value)}>
          {vans.map((van) => (
            <option key={van.id} value={van.id}>
              {van.name}
            </option>
          ))}
        </SelectField>
      )}
      {vanId && <VanBoardings key={vanId} vanId={vanId} />}
    </div>
  );
}
