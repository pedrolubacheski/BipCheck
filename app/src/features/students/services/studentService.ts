import { supabase } from '@/lib/supabase.ts';
import { throwIfError } from '@/shared/errors.ts';
import { normalizeCardUid } from '../cardUid.ts';
import type { Student, UnknownCard } from '../types.ts';

type StudentRow = {
  id: string;
  name: string;
  city: string | null;
  cards: { id: string; uid: string; active: boolean }[];
};

export function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    cards: [...row.cards].sort((a, b) => a.uid.localeCompare(b.uid)),
  };
}

export async function listStudents(companyId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, city, cards(id, uid, active)')
    .eq('company_id', companyId)
    .order('name');
  throwIfError(error);
  return (data ?? []).map(toStudent);
}

export async function createStudent(
  companyId: string,
  input: { name: string; city: string },
): Promise<void> {
  const { error } = await supabase.from('students').insert({
    company_id: companyId,
    name: input.name.trim(),
    city: input.city.trim() || null,
  });
  throwIfError(error);
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  throwIfError(error);
}

export async function addCard(companyId: string, studentId: string, uid: string): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .insert({ company_id: companyId, student_id: studentId, uid: normalizeCardUid(uid) });
  throwIfError(error);
}

export async function setCardActive(cardId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('cards').update({ active }).eq('id', cardId);
  throwIfError(error);
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', cardId);
  throwIfError(error);
}

type UnknownCardLog = { created_at: string; metadata: unknown };

// Um item por UID (o mais recente), ignorando os que já foram cadastrados depois
export function toUnknownCards(logs: UnknownCardLog[], registeredUids: Set<string>): UnknownCard[] {
  const latest = new Map<string, string>();
  for (const log of logs) {
    const uid = (log.metadata as { uid?: unknown } | null)?.uid;
    if (typeof uid !== 'string' || registeredUids.has(uid)) continue;
    const seen = latest.get(uid);
    if (!seen || log.created_at > seen) latest.set(uid, log.created_at);
  }
  return [...latest]
    .map(([uid, lastSeenAt]) => ({ uid, lastSeenAt }))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function listUnknownCards(
  companyId: string,
  registeredUids: Set<string>,
): Promise<UnknownCard[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('created_at, metadata')
    .eq('company_id', companyId)
    .eq('action', 'boarding.unknown_card')
    .order('created_at', { ascending: false })
    .limit(100);
  throwIfError(error);
  return toUnknownCards(data ?? [], registeredUids);
}
