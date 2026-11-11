// Edge Function register-boarding: ponte entre o leitor ESP32 e o banco.
// O ESP32 não tem login: ele se identifica pelo device_token (verify_jwt = false no config.toml).
// Deploy: npx supabase functions deploy register-boarding --no-verify-jwt

import { createClient } from '@supabase/supabase-js';
import { type BoardingStatus, createHandler } from './handler.ts';
import { createRateLimiter } from './rateLimiter.ts';

// A service_role só existe aqui no servidor. Cliente criado fora do handler para ser reaproveitado.
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

const handler = createHandler({
  ipRateLimiter: createRateLimiter({ limit: 30, windowMs: 10_000 }),
  registerBoarding: async (deviceToken, uid, readAt) => {
    const { data, error } = await supabase.rpc('register_boarding', {
      p_device_token: deviceToken,
      p_uid: uid,
      // Só vai quando o leitor mandou: leitura feita na hora usa o relógio do banco
      ...(readAt ? { p_read_at: readAt } : {}),
    });
    if (error) throw new Error(error.message);
    return (data as { status: BoardingStatus }).status;
  },
});

Deno.serve(handler);
