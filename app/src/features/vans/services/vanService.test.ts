import { listVansForUser } from './vanService.ts';

// Simula o Supabase só na fronteira: cada tabela devolve dados fixos
const tables: Record<string, unknown[]> = {
  vans: [
    { id: 'v1', name: 'Van 1' },
    { id: 'v2', name: 'Van 2' },
  ],
  van_drivers: [
    { id: 'd1', van_id: 'v2', user_id: 'motorista' },
    { id: 'd2', van_id: 'v1', user_id: 'outro' },
  ],
};

vi.mock('@/lib/supabase.ts', () => {
  const query = (table: string) => {
    const result = { data: tables[table], error: null };
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };
    return builder;
  };
  return { supabase: { from: query } };
});

describe('listVansForUser', () => {
  it('dono vê todas as vans da empresa', async () => {
    const vans = await listVansForUser('c1', 'dono', true);

    expect(vans.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('motorista vê só as vans vinculadas a ele', async () => {
    const vans = await listVansForUser('c1', 'motorista', false);

    expect(vans).toEqual([{ id: 'v2', name: 'Van 2' }]);
  });

  it('motorista sem vínculo não vê nenhuma van', async () => {
    expect(await listVansForUser('c1', 'sem-van', false)).toEqual([]);
  });
});
