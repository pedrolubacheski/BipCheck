import { assertEquals } from '@std/assert';
import { createRateLimiter } from './rateLimiter.ts';

function fakeClock(start = 0) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

Deno.test('permite até o limite dentro da janela e bloqueia o excedente', () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: clock.now });

  assertEquals([limiter.allow('ip'), limiter.allow('ip'), limiter.allow('ip')], [
    true,
    true,
    false,
  ]);
});

Deno.test('libera de novo quando a janela vence', () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  limiter.allow('ip');

  clock.advance(1000);

  assertEquals(limiter.allow('ip'), true);
});

Deno.test('cada chave tem o próprio limite', () => {
  const clock = fakeClock();
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
  limiter.allow('ip-a');

  assertEquals(limiter.allow('ip-b'), true);
  assertEquals(limiter.allow('ip-a'), false);
});
