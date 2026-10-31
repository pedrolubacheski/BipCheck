import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useRequiredUser } from '@/features/auth/index.ts';
import { ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { CompanyContext, type CompanyState } from './CompanyContext.ts';
import { CreateCompanyPage } from './CreateCompanyPage.tsx';
import { listMyMemberships } from './services/companyService.ts';

const STORAGE_KEY = 'bipcheck.companyId';

// Carrega as empresas da pessoa logada. Sem nenhuma, mostra a tela de criar empresa.
export function CompanyProvider({ children }: { children: ReactNode }) {
  const user = useRequiredUser();
  const load = useCallback(() => listMyMemberships(user.id), [user.id]);
  const { data: memberships, loading, error, reload } = useAsyncData(load);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem(STORAGE_KEY));

  const state = useMemo<CompanyState>(() => {
    const list = memberships ?? [];
    const current = list.find((m) => m.companyId === selectedId) ?? list[0] ?? null;
    return {
      memberships: list,
      current,
      reload,
      select: (companyId) => {
        localStorage.setItem(STORAGE_KEY, companyId);
        setSelectedId(companyId);
      },
    };
  }, [memberships, selectedId, reload]);

  if (loading && !memberships) return <LoadingMessage />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <CompanyContext value={state}>
      {state.current ? children : <CreateCompanyPage onCreated={reload} />}
    </CompanyContext>
  );
}
