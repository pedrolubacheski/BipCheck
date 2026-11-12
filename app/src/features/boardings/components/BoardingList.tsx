import { Badge } from '@/shared/components/Badge.tsx';
import { EmptyMessage } from '@/shared/components/Feedback.tsx';
import { IconCard } from '@/shared/components/icons.tsx';
import { formatTime } from '@/shared/dates.ts';
import type { Boarding } from '../types.ts';

type BoardingListProps = {
  boardings: Boarding[];
  // Embarque que acabou de chegar: aparece destacado e com a etiqueta "Novo"
  highlightId?: number;
};

export function BoardingList({ boardings, highlightId }: BoardingListProps) {
  if (boardings.length === 0) {
    return (
      <EmptyMessage title="Ninguém embarcou ainda" icon={<IconCard className="size-10" />}>
        Quando um aluno encostar o cartão no leitor, o nome dele aparece aqui na hora.
      </EmptyMessage>
    );
  }

  return (
    <ul className="divide-y divide-slate-200" aria-label="Embarques de hoje">
      {boardings.map((boarding) => {
        const isNew = boarding.id === highlightId;
        return (
          <li
            key={boarding.id}
            className={`flex min-h-16 items-center justify-between gap-3 py-3 ${isNew ? 'animate-arrive -mx-2 rounded-xl bg-emerald-50 px-2 shadow-sm' : ''}`}
          >
            <span className="min-w-0 text-xl font-semibold break-words text-slate-900">
              {boarding.studentName}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {isNew && <Badge tone="success">Novo</Badge>}
              <time dateTime={boarding.boardedAt} className="text-lg text-slate-700 tabular-nums">
                {formatTime(boarding.boardedAt)}
              </time>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
