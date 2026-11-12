import { type FormEvent, useCallback, useState } from 'react';
import { useCurrentCompany } from '@/features/companies/index.ts';
import { Badge } from '@/shared/components/Badge.tsx';
import { Button } from '@/shared/components/Button.tsx';
import { type Confirmation, ConfirmDialog } from '@/shared/components/ConfirmDialog.tsx';
import { EmptyMessage, ErrorMessage, LoadingMessage } from '@/shared/components/Feedback.tsx';
import { IconCard, IconChevronDown, IconPlus, IconStudents } from '@/shared/components/icons.tsx';
import { PageTitle, Panel } from '@/shared/components/Panel.tsx';
import { SelectField } from '@/shared/components/SelectField.tsx';
import { TextField } from '@/shared/components/TextField.tsx';
import { formatDateTime } from '@/shared/dates.ts';
import { useAsyncData } from '@/shared/hooks/useAsyncData.ts';
import { useSubmit } from '@/shared/hooks/useSubmit.ts';
import { useToast } from '@/shared/toast/ToastContext.ts';
import { searchStudents } from './searchStudents.ts';
import {
  addCard,
  createStudent,
  deleteCard,
  deleteStudent,
  listStudents,
  listUnknownCards,
  setCardActive,
} from './services/studentService.ts';
import type { Student, UnknownCard } from './types.ts';

// A partir desta quantidade, a lista ganha o campo de procurar
const SEARCH_FROM = 8;

type Run = (action: () => Promise<void>, successMessage: string) => Promise<boolean>;

function cardSummary(student: Student): { label: string; tone: 'success' | 'warning' } {
  const active = student.cards.filter((card) => card.active).length;
  if (student.cards.length === 0) return { label: 'Sem cartão', tone: 'warning' };
  if (active === 0) return { label: 'Cartão desativado', tone: 'warning' };
  return { label: active === 1 ? '1 cartão' : `${active} cartões`, tone: 'success' };
}

// Cartão encostado no leitor que ainda não é de ninguém: escolher o aluno e confirmar
function UnknownCardItem({
  card,
  students,
  busy,
  onLink,
}: {
  card: UnknownCard;
  students: Student[];
  busy: boolean;
  onLink: (studentId: string) => void;
}) {
  const [studentId, setStudentId] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onLink(studentId);
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-2 font-mono text-lg font-semibold">
            <IconCard className="size-5" />
            {card.uid}
          </span>
          <span className="text-base text-slate-700">
            lido em {formatDateTime(card.lastSeenAt)}
          </span>
        </p>
        <SelectField
          label="De qual aluno é este cartão?"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <option value="">Escolha o aluno</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </SelectField>
        <Button type="submit" size="md" disabled={busy}>
          Ligar cartão ao aluno
        </Button>
      </form>
    </li>
  );
}

// Cada aluno abre e fecha: a lista fica curta e os detalhes aparecem só quando pedidos
function StudentItem({
  student,
  companyId,
  busy,
  run,
  onConfirm,
}: {
  student: Student;
  companyId: string;
  busy: boolean;
  run: Run;
  onConfirm: (confirmation: Confirmation) => void;
}) {
  const [uid, setUid] = useState('');
  const summary = cardSummary(student);

  async function handleAddCard(event: FormEvent) {
    event.preventDefault();
    if (await run(() => addCard(companyId, student.id, uid), 'Cartão adicionado.')) setUid('');
  }

  return (
    <li>
      <details className="group">
        <summary className="flex min-h-16 items-center justify-between gap-3 py-3">
          <span className="min-w-0">
            <span className="block text-xl font-semibold break-words">{student.name}</span>
            {student.city && <span className="block text-base text-slate-700">{student.city}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Badge tone={summary.tone}>{summary.label}</Badge>
            <IconChevronDown className="size-6 text-slate-700 transition-transform group-open:rotate-180" />
          </span>
        </summary>

        <div className="flex flex-col gap-4 pb-5">
          {student.cards.length > 0 && (
            <ul className="flex flex-col gap-3">
              {student.cards.map((card) => (
                <li
                  key={card.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-mono text-lg font-semibold">
                      <IconCard className="size-5" />
                      {card.uid}
                    </span>
                    <Badge tone={card.active ? 'success' : 'warning'}>
                      {card.active ? 'Ativo' : 'Desativado'}
                    </Badge>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => setCardActive(card.id, !card.active),
                          card.active ? 'Cartão desativado.' : 'Cartão ativado.',
                        )
                      }
                    >
                      {card.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="md"
                      disabled={busy}
                      onClick={() =>
                        onConfirm({
                          title: 'Remover este cartão?',
                          description: `O cartão ${card.uid} deixa de registrar embarques de ${student.name}.`,
                          confirmLabel: 'Remover cartão',
                          danger: true,
                          onConfirm: () => void run(() => deleteCard(card.id), 'Cartão removido.'),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddCard} className="flex flex-col gap-3">
            <TextField
              label="Código do cartão"
              placeholder="Ex.: A1B2C3D4"
              hint="Mais fácil: encoste o cartão no leitor e ele aparece no topo desta tela."
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
              value={uid}
              onChange={(e) => setUid(e.target.value)}
            />
            <Button type="submit" variant="secondary" size="md" disabled={busy}>
              Adicionar cartão
            </Button>
          </form>

          <Button
            variant="dangerOutline"
            size="md"
            disabled={busy}
            onClick={() =>
              onConfirm({
                title: `Apagar ${student.name}?`,
                description:
                  'Os cartões e os embarques deste aluno também serão apagados. Não dá para desfazer.',
                confirmLabel: 'Apagar aluno',
                danger: true,
                onConfirm: () => void run(() => deleteStudent(student.id), 'Aluno apagado.'),
              })
            }
          >
            Apagar aluno
          </Button>
        </div>
      </details>
    </li>
  );
}

export function StudentsPage() {
  const { companyId } = useCurrentCompany();
  const toast = useToast();
  const load = useCallback(async () => {
    const students = await listStudents(companyId);
    const registered = new Set(students.flatMap((s) => s.cards.map((c) => c.uid)));
    const unknownCards = await listUnknownCards(companyId, registered);
    return { students, unknownCards };
  }, [companyId]);
  const { data, loading, error, reload } = useAsyncData(load);

  const [formOpen, setFormOpen] = useState<boolean>();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const create = useSubmit(createStudent);
  const change = useSubmit(async (action: () => Promise<void>) => action());

  // Sem nenhum aluno, o formulário já aparece aberto: é o próximo passo óbvio
  const isEmpty = data?.students.length === 0;
  const showForm = formOpen ?? isEmpty;
  const visibleStudents = data ? searchStudents(data.students, query) : [];

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (await create.submit(companyId, { name, city })) {
      setName('');
      setCity('');
      setFormOpen(false);
      toast('Aluno cadastrado.');
      reload();
    }
  }

  const run: Run = async (action, successMessage) => {
    const ok = await change.submit(action);
    if (ok) {
      toast(successMessage);
      reload();
    }
    return ok;
  };

  return (
    <>
      <PageTitle description="Os alunos e o cartão que cada um usa para embarcar.">
        Alunos
      </PageTitle>

      {showForm ? (
        <Panel title="Novo aluno">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <TextField
              label="Nome do aluno"
              autoComplete="off"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Cidade (se quiser)"
              autoComplete="off"
              maxLength={80}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <ErrorMessage error={create.error} />
            <Button type="submit" loading={create.submitting} loadingLabel="Cadastrando...">
              Cadastrar aluno
            </Button>
            {!isEmpty && (
              <Button
                variant="secondary"
                disabled={create.submitting}
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
            )}
          </form>
        </Panel>
      ) : (
        data && (
          <Button icon={<IconPlus />} onClick={() => setFormOpen(true)}>
            Cadastrar aluno
          </Button>
        )
      )}

      {loading && !data && <LoadingMessage />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={change.error} />

      {data && data.unknownCards.length > 0 && data.students.length > 0 && (
        <Panel title="Cartões novos para ligar a um aluno" className="border-2 border-amber-600">
          <p className="mb-4 text-slate-700">
            Estes cartões foram encostados no leitor e ainda não são de ninguém.
          </p>
          <ul className="divide-y divide-slate-200">
            {data.unknownCards.map((card) => (
              <UnknownCardItem
                key={card.uid}
                card={card}
                students={data.students}
                busy={change.submitting}
                onLink={(studentId) =>
                  void run(() => addCard(companyId, studentId, card.uid), 'Cartão ligado ao aluno.')
                }
              />
            ))}
          </ul>
        </Panel>
      )}

      {isEmpty && (
        <EmptyMessage title="Nenhum aluno cadastrado" icon={<IconStudents className="size-10" />}>
          Preencha o nome acima para cadastrar o primeiro.
        </EmptyMessage>
      )}

      {data && data.students.length > 0 && (
        <Panel title={`Alunos cadastrados: ${data.students.length}`}>
          {data.students.length >= SEARCH_FROM && (
            <TextField
              label="Procurar aluno pelo nome"
              type="search"
              autoComplete="off"
              className="mb-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          {visibleStudents.length === 0 && (
            <EmptyMessage>Nenhum aluno com esse nome. Confira se digitou certo.</EmptyMessage>
          )}
          <ul className="divide-y divide-slate-200">
            {visibleStudents.map((student) => (
              <StudentItem
                key={student.id}
                student={student}
                companyId={companyId}
                busy={change.submitting}
                run={run}
                onConfirm={setConfirmation}
              />
            ))}
          </ul>
        </Panel>
      )}

      <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}
