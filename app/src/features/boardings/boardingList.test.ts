import { mergeBoarding } from './boardingList.ts';
import type { Boarding } from './types.ts';

const boarding = (id: number, boardedAt: string): Boarding => ({
  id,
  vanId: 'v1',
  studentId: `s${id}`,
  studentName: `Aluno ${id}`,
  boardedAt,
});

describe('mergeBoarding', () => {
  it('coloca o embarque novo no topo', () => {
    const list = [boarding(1, '2026-10-31T18:00:00Z')];

    const merged = mergeBoarding(list, boarding(2, '2026-10-31T18:05:00Z'));

    expect(merged.map((b) => b.id)).toEqual([2, 1]);
  });

  it('não duplica um embarque que já está na lista', () => {
    const list = [boarding(1, '2026-10-31T18:00:00Z')];

    expect(mergeBoarding(list, boarding(1, '2026-10-31T18:00:00Z'))).toBe(list);
  });

  it('mantém a ordem por horário mesmo se o evento chegar atrasado', () => {
    const list = [boarding(3, '2026-10-31T18:10:00Z'), boarding(1, '2026-10-31T18:00:00Z')];

    const merged = mergeBoarding(list, boarding(2, '2026-10-31T18:05:00Z'));

    expect(merged.map((b) => b.id)).toEqual([3, 2, 1]);
  });
});
