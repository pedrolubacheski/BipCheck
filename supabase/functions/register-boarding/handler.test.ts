import { assertEquals } from '@std/assert';
import { type BoardingStatus, createHandler } from './handler.ts';
import { createRateLimiter } from './rateLimiter.ts';

const VALID_TOKEN = 'a'.repeat(48);
const VALID_UID = 'A1B2C3D4';

function setup(options: { status?: BoardingStatus; fails?: boolean; ipLimit?: number } = {}) {
  const calls: Array<{ deviceToken: string; uid: string; readAt?: string }> = [];
  const logs: Array<Record<string, unknown>> = [];
  const handler = createHandler({
    ipRateLimiter: createRateLimiter({ limit: options.ipLimit ?? 100, windowMs: 10_000 }),
    registerBoarding: (deviceToken, uid, readAt) => {
      calls.push({ deviceToken, uid, readAt });
      if (options.fails) return Promise.reject(new Error('banco fora do ar'));
      return Promise.resolve(options.status ?? 'registered');
    },
    log: (entry) => logs.push(entry),
  });
  return { handler, calls, logs };
}

function post(body: unknown, ip = '10.0.0.1') {
  return new Request('http://localhost/register-boarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

Deno.test('registra o embarque e responde 200 com o status', async () => {
  const { handler, calls } = setup();

  const response = await handler(post({ device_token: VALID_TOKEN, uid: VALID_UID }));

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { status: 'registered' });
  assertEquals(calls, [{ deviceToken: VALID_TOKEN, uid: VALID_UID, readAt: undefined }]);
});

Deno.test('toque repetido também responde 200 (o leitor dá bip de sucesso)', async () => {
  const { handler } = setup({ status: 'duplicate' });

  const response = await handler(post({ device_token: VALID_TOKEN, uid: VALID_UID }));

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { status: 'duplicate' });
});

Deno.test('leitura reenviada repassa ao banco o horário em que o cartão foi lido', async () => {
  const { handler, calls } = setup();
  const readAt = '2026-11-11T00:07:57Z';

  const response = await handler(
    post({ device_token: VALID_TOKEN, uid: VALID_UID, read_at: readAt }),
  );

  assertEquals(response.status, 200);
  assertEquals(calls, [{ deviceToken: VALID_TOKEN, uid: VALID_UID, readAt }]);
});

Deno.test('converte cada recusa do banco no código HTTP certo', async () => {
  const expected: Array<[BoardingStatus, number]> = [
    ['invalid_device', 401],
    ['unknown_card', 404],
    ['device_unassigned', 409],
    ['invalid_read_at', 422],
    ['rate_limited', 429],
  ];
  for (const [status, httpStatus] of expected) {
    const { handler } = setup({ status });

    const response = await handler(post({ device_token: VALID_TOKEN, uid: VALID_UID }));

    assertEquals(response.status, httpStatus, status);
    assertEquals(await response.json(), { status });
  }
});

Deno.test('recusa método diferente de POST sem chamar o banco', async () => {
  const { handler, calls } = setup();

  const response = await handler(new Request('http://localhost/register-boarding'));

  assertEquals(response.status, 405);
  assertEquals(calls.length, 0);
});

Deno.test('recusa corpo inválido sem chamar o banco', async () => {
  const invalidBodies = [
    'não é json',
    {},
    { device_token: VALID_TOKEN },
    { device_token: 'curto', uid: VALID_UID },
    { device_token: VALID_TOKEN, uid: 'XYZ!' },
    { device_token: VALID_TOKEN, uid: VALID_UID, extra: 'campo a mais' },
    { device_token: VALID_TOKEN, uid: VALID_UID, read_at: 'ontem' },
    { device_token: VALID_TOKEN, uid: VALID_UID, read_at: 1794355677 },
  ];
  for (const body of invalidBodies) {
    const { handler, calls } = setup();

    const response = await handler(post(body));

    assertEquals(response.status, 400, JSON.stringify(body));
    assertEquals(calls.length, 0);
  }
});

Deno.test('limita requisições por IP', async () => {
  const { handler, calls } = setup({ ipLimit: 2 });
  const body = { device_token: VALID_TOKEN, uid: VALID_UID };

  await handler(post(body));
  await handler(post(body));
  const blocked = await handler(post(body));
  const otherIp = await handler(post(body, '10.0.0.2'));

  assertEquals(blocked.status, 429);
  assertEquals(otherIp.status, 200);
  assertEquals(calls.length, 3);
});

Deno.test('erro do banco vira 500 genérico, sem detalhe técnico na resposta', async () => {
  const { handler } = setup({ fails: true });

  const response = await handler(post({ device_token: VALID_TOKEN, uid: VALID_UID }));

  assertEquals(response.status, 500);
  assertEquals(await response.json(), { status: 'error' });
});

Deno.test('o log nunca contém o token nem o UID', async () => {
  const { handler, logs } = setup();

  await handler(post({ device_token: VALID_TOKEN, uid: VALID_UID }));

  const logged = JSON.stringify(logs);
  assertEquals(logged.includes(VALID_TOKEN), false);
  assertEquals(logged.includes(VALID_UID), false);
});
