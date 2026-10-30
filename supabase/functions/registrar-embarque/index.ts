// Edge Function: registrar-embarque
// Recebe { device_token, uid } do ESP32 e grava o embarque.
// Usa a função SQL registrar_embarque (1 ida ao banco em vez de 3).
// Deploy (o ESP32 não tem login, a autenticação é o device_token):
//   supabase functions deploy registrar-embarque --no-verify-jwt
// (ou cole este código no editor do painel e desligue a verificação de JWT)

import { createClient } from "npm:@supabase/supabase-js@2";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// A service role só existe aqui no servidor, nunca no ESP32.
// Criado fora do handler para ser reaproveitado entre chamadas.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  const { device_token, uid } = await req.json().catch(() => ({}));
  if (!device_token || !uid) {
    return json({ erro: "device_token e uid são obrigatórios" }, 400);
  }

  const { data, error } = await supabase.rpc("registrar_embarque", {
    p_device_token: String(device_token),
    p_uid: String(uid),
  });

  if (error) return json({ erro: "Falha ao gravar embarque" }, 500);
  if (data === "aparelho_invalido") return json({ erro: "Aparelho não reconhecido" }, 401);
  if (data === "cartao_nao_cadastrado") {
    return json({ erro: "Cartão não cadastrado nesta van" }, 404);
  }

  return json({ ok: true });
});
