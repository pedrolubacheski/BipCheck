import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { mergeBoarding } from '../boardingList.ts';
import { listTodayBoardings, subscribeToVanBoardings } from '../services/boardingService.ts';
import { playBeep } from '../sound.ts';
import type { Boarding } from '../types.ts';

// Embarques de hoje da van + os que chegam em tempo real (com bip)
export function useVanBoardings(vanId: string) {
  const load = useCallback(() => listTodayBoardings(vanId), [vanId]);
  const { data, loading, error } = useAsyncData(load);
  const [live, setLive] = useState<{ vanId: string; items: Boarding[] }>({ vanId, items: [] });

  useEffect(
    () =>
      subscribeToVanBoardings(vanId, (boarding) => {
        setLive((prev) => ({
          vanId,
          items: mergeBoarding(prev.vanId === vanId ? prev.items : [], boarding),
        }));
        playBeep();
      }),
    [vanId],
  );

  // Lista carregada + recebidos ao vivo desta van, sem duplicar
  const liveItems = live.vanId === vanId ? live.items : [];
  const boardings = liveItems.reduce(mergeBoarding, data ?? []);

  return { boardings, loading, error };
}
