import { act, renderHook, waitFor } from '@testing-library/react';
import { listTodayBoardings, subscribeToVanBoardings } from '../services/boardingService.ts';
import type { Boarding } from '../types.ts';
import { useVanBoardings } from './useVanBoardings.ts';

// Fronteira com o Supabase: a lista e a escuta em tempo real são simuladas
vi.mock('../services/boardingService.ts', () => ({
  listTodayBoardings: vi.fn<typeof listTodayBoardings>(),
  subscribeToVanBoardings: vi.fn<typeof subscribeToVanBoardings>(),
}));

const listMock = vi.mocked(listTodayBoardings);
const subscribeMock = vi.mocked(subscribeToVanBoardings);

function boarding(id: number, studentName: string, boardedAt: string): Boarding {
  return { id, vanId: 'v1', studentId: `s${id}`, studentName, boardedAt };
}

const arthur = boarding(1, 'Arthur', '2026-10-31T21:00:00Z');
const bruna = boarding(2, 'Bruna', '2026-10-31T21:05:00Z');

// Devolve as funções que o hook entregou à escuta, para simular eventos do servidor
function liveCallbacks() {
  const [, onBoarding, onConnectionChange] = subscribeMock.mock.calls.at(-1)!;
  return { onBoarding, onConnectionChange: onConnectionChange! };
}

describe('useVanBoardings', () => {
  beforeEach(() => {
    listMock.mockReset();
    subscribeMock.mockReset();
    subscribeMock.mockReturnValue(() => {});
  });

  it('mostra no topo e destaca o embarque que chega ao vivo', async () => {
    listMock.mockResolvedValue([arthur]);
    const { result } = renderHook(() => useVanBoardings('v1'));
    await waitFor(() => expect(result.current.boardings).toEqual([arthur]));

    act(() => liveCallbacks().onBoarding(bruna));

    expect(result.current.boardings).toEqual([bruna, arthur]);
    expect(result.current.latest).toEqual(bruna);
  });

  it('informa quando a atualização ao vivo está ligada ou caiu', async () => {
    listMock.mockResolvedValue([]);
    const { result } = renderHook(() => useVanBoardings('v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connected).toBeNull();

    act(() => liveCallbacks().onConnectionChange(true));
    expect(result.current.connected).toBe(true);

    act(() => liveCallbacks().onConnectionChange(false));
    expect(result.current.connected).toBe(false);
  });

  it('busca a lista de novo quando a conexão ao vivo cai e volta', async () => {
    listMock.mockResolvedValueOnce([arthur]).mockResolvedValueOnce([bruna, arthur]);
    const { result } = renderHook(() => useVanBoardings('v1'));
    await waitFor(() => expect(result.current.boardings).toEqual([arthur]));
    act(() => liveCallbacks().onConnectionChange(true));

    act(() => liveCallbacks().onConnectionChange(false));
    act(() => liveCallbacks().onConnectionChange(true));

    await waitFor(() => expect(result.current.boardings).toEqual([bruna, arthur]));
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it('busca a lista de novo quando a internet volta', async () => {
    listMock.mockResolvedValueOnce([]).mockResolvedValueOnce([arthur]);
    const { result } = renderHook(() => useVanBoardings('v1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(result.current.boardings).toEqual([arthur]));
  });
});
