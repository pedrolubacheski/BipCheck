import { supabase } from '@/lib/supabase.ts';
import { startOfToday } from '@/shared/dates.ts';
import { throwIfError } from '@/shared/errors.ts';
import type { Boarding } from '../types.ts';

const BOARDING_COLUMNS = 'id, van_id, student_id, boarded_at, students(name)';

type BoardingRow = {
  id: number;
  van_id: string;
  student_id: string;
  boarded_at: string;
  students: { name: string } | null;
};

function toBoarding(row: BoardingRow): Boarding {
  return {
    id: row.id,
    vanId: row.van_id,
    studentId: row.student_id,
    studentName: row.students?.name ?? 'Aluno removido',
    boardedAt: row.boarded_at,
  };
}

export async function listTodayBoardings(vanId: string): Promise<Boarding[]> {
  const { data, error } = await supabase
    .from('boardings')
    .select(BOARDING_COLUMNS)
    .eq('van_id', vanId)
    .gte('boarded_at', startOfToday().toISOString())
    .order('boarded_at', { ascending: false })
    .limit(200);
  throwIfError(error);
  return (data ?? []).map(toBoarding);
}

async function getBoarding(id: number): Promise<Boarding | null> {
  const { data, error } = await supabase
    .from('boardings')
    .select(BOARDING_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  throwIfError(error);
  return data ? toBoarding(data) : null;
}

// Escuta só os embarques da van escolhida (nunca a tabela inteira); devolve a função para parar
export function subscribeToVanBoardings(
  vanId: string,
  onBoarding: (boarding: Boarding) => void,
): () => void {
  const channel = supabase
    .channel(`boardings:${vanId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'boardings', filter: `van_id=eq.${vanId}` },
      (payload) => {
        const id = (payload.new as { id: number }).id;
        // Busca com o nome do aluno (o evento traz só a linha crua)
        getBoarding(id)
          .then((boarding) => boarding && onBoarding(boarding))
          .catch((error: unknown) => console.error('Falha ao carregar embarque recebido', error));
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
