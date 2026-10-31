import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsyncData } from './useAsyncData.ts';

describe('useAsyncData', () => {
  it('começa carregando e entrega os dados', async () => {
    const load = vi.fn<() => Promise<string[]>>().mockResolvedValue(['a', 'b']);

    const { result } = renderHook(() => useAsyncData(load));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.error).toBeNull();
  });

  it('expõe o erro quando o service falha', async () => {
    const failure = new Error('falhou');
    const load = vi.fn<() => Promise<string[]>>().mockRejectedValue(failure);

    const { result } = renderHook(() => useAsyncData(load));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(failure);
    expect(result.current.data).toBeUndefined();
  });

  it('busca de novo ao chamar reload', async () => {
    const load = vi.fn<() => Promise<number>>().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => useAsyncData(load));
    await waitFor(() => expect(result.current.data).toBe(1));

    act(() => result.current.reload());

    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
