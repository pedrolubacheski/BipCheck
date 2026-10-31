// Lógica da função register-boarding, separada do Deno.serve para ser testável.
// Recebe { device_token, uid } do ESP32, valida e chama a RPC register_boarding.

import { z } from 'zod';
import type { RateLimiter } from './rateLimiter.ts';

export const boardingRequestSchema = z.strictObject({
  device_token: z.string().regex(/^[0-9a-f]{48}$/i),
  uid: z.string().regex(/^[0-9a-f]{8,20}$/i),
});

export type BoardingStatus =
  | 'registered'
  | 'duplicate'
  | 'invalid_device'
  | 'device_unassigned'
  | 'unknown_card'
  | 'rate_limited';

export type RegisterBoarding = (deviceToken: string, uid: string) => Promise<BoardingStatus>;

// O firmware decide o bip pelo código HTTP: 200 = sucesso (bip longo), resto = erro
const httpStatusByBoardingStatus: Record<BoardingStatus, number> = {
  registered: 200,
  duplicate: 200,
  invalid_device: 401,
  unknown_card: 404,
  device_unassigned: 409,
  rate_limited: 429,
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function createHandler(deps: {
  registerBoarding: RegisterBoarding;
  ipRateLimiter: RateLimiter;
  log?: (entry: Record<string, unknown>) => void;
}) {
  const log = deps.log ?? ((entry) => console.log(JSON.stringify(entry)));

  return async (req: Request): Promise<Response> => {
    const startedAt = Date.now();

    // Sem cabeçalhos CORS de propósito: só o ESP32 chama esta função, nunca um navegador
    if (req.method !== 'POST') return json({ status: 'method_not_allowed' }, 405);

    if (!deps.ipRateLimiter.allow(clientIp(req))) {
      log({ event: 'boarding', status: 'ip_rate_limited' });
      return json({ status: 'rate_limited' }, 429);
    }

    const parsed = boardingRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ status: 'invalid_request' }, 400);

    try {
      const status = await deps.registerBoarding(parsed.data.device_token, parsed.data.uid);
      // Nunca logar o token nem o UID
      log({ event: 'boarding', status, duration_ms: Date.now() - startedAt });
      return json({ status }, httpStatusByBoardingStatus[status]);
    } catch (error) {
      log({ event: 'boarding', status: 'error', error: String(error) });
      return json({ status: 'error' }, 500);
    }
  };
}
