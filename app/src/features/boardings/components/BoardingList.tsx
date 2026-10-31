import { formatTime } from '@/shared/dates.ts';
import { EmptyMessage } from '@/shared/components/Feedback.tsx';
import type { Boarding } from '../types.ts';

export function BoardingList({ boardings }: { boardings: Boarding[] }) {
  if (boardings.length === 0) return <EmptyMessage>Nenhum embarque hoje.</EmptyMessage>;

  return (
    <ul className="divide-y divide-slate-100" aria-label="Embarques de hoje">
      {boardings.map((boarding) => (
        <li key={boarding.id} className="flex items-center justify-between py-3">
          <span className="text-lg font-medium text-slate-800">{boarding.studentName}</span>
          <time dateTime={boarding.boardedAt} className="text-slate-500">
            {formatTime(boarding.boardedAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
