import { type FormEvent, useCallback, useState } from 'react';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { formatDateTime } from '@/shared/dates.ts';
import { Button } from '@/shared/components/Button.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import {
  addCard,
  createStudent,
  deleteCard,
  deleteStudent,
  listStudents,
  listUnknownCards,
  setCardActive,
} from './services/studentService.ts';
import type { Student } from './types.ts';

function StudentCard({
  student,
  busy,
  onAddCard,
  onRun,
}: {
  student: Student;
  busy: boolean;
  onAddCard: (studentId: string, uid: string) => Promise<boolean>;
  onRun: (action: () => Promise<void>) => void;
}) {
  const [uid, setUid] = useState('');

  async function handleAddCard(event: FormEvent) {
    event.preventDefault();
    if (await onAddCard(student.id, uid)) setUid('');
  }

  return (
    <Panel title={student.name}>
      {student.city && <p className="-mt-2 mb-2 text-sm text-slate-500">{student.city}</p>}
      <h3 className="text-sm font-medium text-slate-700">Cartões</h3>
      {student.cards.length === 0 && <p className="text-sm text-slate-500">Nenhum cartão.</p>}
      <ul className="mb-3 divide-y divide-slate-100">
        {student.cards.map((card) => (
          <li key={card.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className={`font-mono ${card.active ? '' : 'text-slate-400 line-through'}`}>
              {card.uid}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onRun(() => setCardActive(card.id, !card.active))}
              >
                {card.active ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => onRun(() => deleteCard(card.id))}
              >
                Remover
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAddCard} className="flex items-end gap-2">
        <TextField
          label="UID do cartão"
          placeholder="Ex.: A1B2C3D4"
          className="flex-1"
          required
          value={uid}
          onChange={(e) => setUid(e.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Adicionar
        </Button>
      </form>
      <Button
        variant="danger"
        className="mt-3"
        disabled={busy}
        onClick={() => {
          if (
            confirm(
              `Apagar ${student.name}? Os cartões e embarques do aluno também serão apagados.`,
            )
          ) {
            onRun(() => deleteStudent(student.id));
          }
        }}
      >
        Apagar aluno
      </Button>
    </Panel>
  );
}

export function StudentsPage() {
  const { companyId } = useCurrentCompany();
  const load = useCallback(async () => {
    const students = await listStudents(companyId);
    const registered = new Set(students.flatMap((s) => s.cards.map((c) => c.uid)));
    const unknownCards = await listUnknownCards(companyId, registered);
    return { students, unknownCards };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const create = useSubmit(createStudent);
  const change = useSubmit(async (action: () => Promise<void>) => action());

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit(companyId, { name, city })) {
      setName('');
      setCity('');
      reload();
    }
  }

  async function run(action: () => Promise<void>): Promise<boolean> {
    const ok = await change.submit(action);
    if (ok) reload();
    return ok;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Alunos</PageTitle>
      <Panel title="Novo aluno">
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <TextField
            label="Nome"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Cidade (opcional)"
            maxLength={80}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <ErrorMessage error={create.error} />
          <Button type="submit" disabled={create.submitting}>
            Cadastrar aluno
          </Button>
        </form>
      </Panel>

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error ?? change.error} />

      {data && data.unknownCards.length > 0 && data.students.length > 0 && (
        <Panel title="Cartões lidos e não cadastrados">
          <p className="mb-2 text-sm text-slate-600">
            Encoste o cartão novo em um leitor da empresa e ele aparece aqui.
          </p>
          <ul className="divide-y divide-slate-100">
            {data.unknownCards.map((card) => (
              <li key={card.uid} className="flex flex-wrap items-end justify-between gap-2 py-2">
                <div>
                  <p className="font-mono">{card.uid}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(card.lastSeenAt)}</p>
                </div>
                <SelectField
                  label="Vincular ao aluno"
                  value=""
                  disabled={change.submitting}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    void run(() => addCard(companyId, studentId, card.uid));
                  }}
                >
                  <option value="">Escolha...</option>
                  {data.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {data?.students.length === 0 && <EmptyMessage>Nenhum aluno cadastrado.</EmptyMessage>}
      {data?.students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          busy={change.submitting}
          onAddCard={(studentId, uid) => run(() => addCard(companyId, studentId, uid))}
          onRun={(action) => void run(action)}
        />
      ))}
    </div>
  );
}
