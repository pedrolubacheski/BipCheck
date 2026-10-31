import type { Boarding } from './types.ts';

// Junta um embarque recebido em tempo real à lista: sem duplicar e do mais recente para o mais antigo
export function mergeBoarding(list: Boarding[], incoming: Boarding): Boarding[] {
  if (list.some((b) => b.id === incoming.id)) return list;
  return [incoming, ...list].sort((a, b) => b.boardedAt.localeCompare(a.boardedAt));
}
