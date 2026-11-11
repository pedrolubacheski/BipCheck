// Teste de integração: função de verdade + banco de verdade (Supabase local, só na CI).
// Precisa de SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no ambiente.

import { assertEquals } from '@std/assert';
import { createClient } from '@supabase/supabase-js';

const url = Deno.env.get('SUPABASE_URL');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ignore = !url || !anonKey || !serviceRoleKey;

async function createFixture() {
  const admin = createClient(url!, serviceRoleKey!, { auth: { persistSession: false } });
  const email = `dono-${crypto.randomUUID()}@teste.local`;
  const password = crypto.randomUUID();
  const { error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;

  const owner = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error: signInError } = await owner.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { data: companyId } = await owner.rpc('create_company', { p_name: 'Empresa Teste' });
  const { data: van } = await owner.from('vans').insert({
    company_id: companyId,
    name: 'Van Teste',
  }).select('id').single();
  const { data: student } = await owner.from('students').insert({
    company_id: companyId,
    name: 'Aluno Fictício',
  }).select('id').single();
  const uid = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
  await owner.from('cards').insert({ company_id: companyId, student_id: student!.id, uid });
  const { data: device } = await owner.rpc('create_device', {
    p_company_id: companyId,
    p_name: 'Leitor Teste',
    p_van_id: van!.id,
  }).single<{ device_id: string; token: string }>();

  return { owner, token: device!.token, uid };
}

function callFunction(body: unknown) {
  return fetch(`${url}/functions/v1/register-boarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

Deno.test({
  name: 'bip com cartão cadastrado grava o embarque e o dono enxerga',
  ignore,
  async fn() {
    const { owner, token, uid } = await createFixture();

    const response = await callFunction({ device_token: token, uid });

    assertEquals(response.status, 200);
    assertEquals(await response.json(), { status: 'registered' });
    const { data: boardings } = await owner.from('boardings').select('id');
    assertEquals(boardings?.length, 1);
  },
});

Deno.test({
  name: 'token desconhecido responde 401 e não grava nada',
  ignore,
  async fn() {
    const { owner, uid } = await createFixture();

    const response = await callFunction({ device_token: 'f'.repeat(48), uid });

    assertEquals(response.status, 401);
    await response.body?.cancel();
    const { data: boardings } = await owner.from('boardings').select('id');
    assertEquals(boardings?.length, 0);
  },
});

Deno.test({
  name: 'cartão não cadastrado responde 404',
  ignore,
  async fn() {
    const { token } = await createFixture();

    const response = await callFunction({ device_token: token, uid: 'FFFFFFFF' });

    assertEquals(response.status, 404);
    await response.body?.cancel();
  },
});

Deno.test({
  name: 'leitura reenviada grava o embarque com o horário em que o cartão foi lido',
  ignore,
  async fn() {
    const { owner, token, uid } = await createFixture();
    const readAt = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');

    const response = await callFunction({ device_token: token, uid, read_at: readAt });

    assertEquals(response.status, 200);
    const { data: boardings } = await owner.from('boardings').select('boarded_at');
    assertEquals(boardings?.length, 1);
    assertEquals(new Date(boardings![0].boarded_at).getTime(), new Date(readAt).getTime());
  },
});

Deno.test({
  name: 'leitura com mais de 12 horas é recusada e não grava embarque',
  ignore,
  async fn() {
    const { owner, token, uid } = await createFixture();
    const readAt = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();

    const response = await callFunction({ device_token: token, uid, read_at: readAt });

    assertEquals(response.status, 422);
    assertEquals(await response.json(), { status: 'invalid_read_at' });
    const { data: boardings } = await owner.from('boardings').select('id');
    assertEquals(boardings?.length, 0);
  },
});
