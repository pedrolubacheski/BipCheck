import { toMembership } from './companyService.ts';

vi.mock('@/lib/supabase.ts', () => ({ supabase: {} }));

describe('toMembership', () => {
  it('converte a linha do banco no formato da tela', () => {
    expect(toMembership({ role: 'owner', companies: { id: 'c1', name: 'Frota Exemplo' } })).toEqual(
      {
        companyId: 'c1',
        companyName: 'Frota Exemplo',
        role: 'owner',
      },
    );
  });

  it('ignora vínculo sem empresa visível', () => {
    expect(toMembership({ role: 'driver', companies: null })).toBeNull();
  });
});
