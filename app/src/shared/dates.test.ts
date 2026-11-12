import { formatLongDate, startOfToday } from './dates.ts';

describe('startOfToday', () => {
  it('volta para a meia-noite do mesmo dia', () => {
    const start = startOfToday(new Date(2026, 9, 31, 18, 45, 12));

    expect(start).toEqual(new Date(2026, 9, 31, 0, 0, 0, 0));
  });

  it('usa o dia atual quando nenhuma data é informada', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15, 22, 30));

    expect(startOfToday()).toEqual(new Date(2026, 0, 15));

    vi.useRealTimers();
  });
});

describe('formatLongDate', () => {
  it('escreve o dia da semana, o dia e o mês por extenso', () => {
    expect(formatLongDate(new Date(2026, 10, 12))).toBe('quinta-feira, 12 de novembro');
  });
});
