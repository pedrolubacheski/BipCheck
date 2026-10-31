// Integração: service do app + Supabase local de verdade (RLS real). Roda só na CI.
import { createClient } from '@supabase/supabase-js';
import { createCompany } from '@/features/companies/services/companyService.ts';
import { supabase } from '@/lib/supabase.ts';
import { addCard, createStudent, listStudents } from './studentService.ts';

// A service_role vem do ambiente da CI e só é usada aqui no teste (nunca com prefixo VITE_,
// para não ter risco de ir parar no código do app)
declare const process: { env: Record<string, string | undefined> };

const admin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } },
);

async function signInAsNewUser(): Promise<void> {
  const email = `dono-${crypto.randomUUID()}@teste.local`;
  const password = crypto.randomUUID();
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  await supabase.auth.signInWithPassword({ email, password });
}

describe('studentService com o banco de verdade', () => {
  afterEach(() => supabase.auth.signOut());

  it('o dono cadastra aluno com cartão e vê na lista', async () => {
    await signInAsNewUser();
    const companyId = await createCompany('Empresa Integração');

    await createStudent(companyId, { name: 'Aluno Fictício', city: 'Cidade Teste' });
    const [student] = await listStudents(companyId);
    await addCard(companyId, student!.id, 'a1 b2 c3 d4');

    const students = await listStudents(companyId);
    expect(students).toHaveLength(1);
    expect(students[0]!.cards.map((c) => c.uid)).toEqual(['A1B2C3D4']);
  });

  it('outra empresa não enxerga nem cadastra alunos na primeira', async () => {
    await signInAsNewUser();
    const companyA = await createCompany('Empresa A');
    await createStudent(companyA, { name: 'Aluno A', city: '' });
    await supabase.auth.signOut();

    await signInAsNewUser();

    expect(await listStudents(companyA)).toEqual([]);
    await expect(createStudent(companyA, { name: 'Intruso', city: '' })).rejects.toMatchObject({
      code: '42501',
    });
  });
});
