import { createContext, useContext } from 'react';
import type { Membership } from './types.ts';

export type CompanyState = {
  memberships: Membership[];
  current: Membership | null;
  select: (companyId: string) => void;
  reload: () => void;
};

export const CompanyContext = createContext<CompanyState | null>(null);

// Empresa escolhida no momento; só existe dentro de CompanyProvider com empresa selecionada
export function useCurrentCompany(): Membership {
  const state = useContext(CompanyContext);
  if (!state?.current) throw new Error('useCurrentCompany usado sem empresa selecionada');
  return state.current;
}

export function useCompanies(): CompanyState {
  const state = useContext(CompanyContext);
  if (!state) throw new Error('useCompanies usado fora de CompanyProvider');
  return state;
}
