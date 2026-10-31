import { toStudent, toUnknownCards } from './studentService.ts';

vi.mock('@/lib/supabase.ts', () => ({ supabase: {} }));

describe('toStudent', () => {
  it('converte a linha do banco e ordena os cartões pelo UID', () => {
    const student = toStudent({
      id: 's1',
      name: 'Aluno Exemplo',
      city: null,
      cards: [
        { id: 'c2', uid: 'FF000000', active: true },
        { id: 'c1', uid: 'A1B2C3D4', active: false },
      ],
    });

    expect(student).toEqual({
      id: 's1',
      name: 'Aluno Exemplo',
      city: null,
      cards: [
        { id: 'c1', uid: 'A1B2C3D4', active: false },
        { id: 'c2', uid: 'FF000000', active: true },
      ],
    });
  });
});

describe('toUnknownCards', () => {
  it('agrupa por UID mantendo a leitura mais recente, da mais nova para a mais antiga', () => {
    const cards = toUnknownCards(
      [
        { created_at: '2026-10-31T10:00:00Z', metadata: { uid: 'AAAA0000' } },
        { created_at: '2026-10-31T12:00:00Z', metadata: { uid: 'AAAA0000' } },
        { created_at: '2026-10-31T11:00:00Z', metadata: { uid: 'BBBB0000' } },
      ],
      new Set(),
    );

    expect(cards).toEqual([
      { uid: 'AAAA0000', lastSeenAt: '2026-10-31T12:00:00Z' },
      { uid: 'BBBB0000', lastSeenAt: '2026-10-31T11:00:00Z' },
    ]);
  });

  it('esconde cartões que já foram cadastrados', () => {
    const cards = toUnknownCards(
      [{ created_at: '2026-10-31T10:00:00Z', metadata: { uid: 'AAAA0000' } }],
      new Set(['AAAA0000']),
    );

    expect(cards).toEqual([]);
  });

  it('ignora registros sem UID', () => {
    expect(
      toUnknownCards([{ created_at: '2026-10-31T10:00:00Z', metadata: {} }], new Set()),
    ).toEqual([]);
  });
});
