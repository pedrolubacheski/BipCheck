import { useCallback, useEffect, useRef, useState } from 'react';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { mergeBoarding } from '../boardingList.ts';
import { listTodayBoardings, subscribeToVanBoardings } from '../services/boardingService.ts';
import { playBeep } from '../sound.ts';
import type { Boarding } from '../types.ts';

// Tempo que o embarque recém-chegado fica destacado na lista
const HIGHLIGHT_MS = 8000;

// Embarques de hoje da van + os que chegam em tempo real (com bip)
export function useVanBoardings(vanId: string) {
  const load = useCallback(() => listTodayBoardings(vanId), [vanId]);
  const { data, loading, error, reload } = useAsyncData(load);
  const [live, setLive] = useState<{ vanId: string; items: Boarding[] }>({ vanId, items: [] });
  // null: ainda conectando (evita piscar o aviso de "sem atualização" ao abrir a tela)
  const [connected, setConnected] = useState<boolean | null>(null);
  const [latest, setLatest] = useState<Boarding | null>(null);
  const droppedRef = useRef(false);

  useEffect(
    () =>
      subscribeToVanBoardings(
        vanId,
        (boarding) => {
          setLive((prev) => ({
            vanId,
            items: mergeBoarding(prev.vanId === vanId ? prev.items : [], boarding),
          }));
          setLatest(boarding);
          playBeep();
        },
        (isConnected) => {
          setConnected(isConnected);
          // A escuta caiu e voltou: busca de novo o que pode ter chegado nesse intervalo
          if (isConnected && droppedRef.current) reload();
          droppedRef.current = !isConnected;
        },
      ),
    [vanId, reload],
  );

  // Celular saiu da espera ou a internet voltou: a lista pode estar desatualizada
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [reload]);

  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(() => setLatest(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [latest]);

  // Lista carregada + recebidos ao vivo desta van, sem duplicar
  const liveItems = live.vanId === vanId ? live.items : [];
  const boardings = liveItems.reduce(mergeBoarding, data ?? []);

  return { boardings, loading, error, reload, connected, latest };
}
