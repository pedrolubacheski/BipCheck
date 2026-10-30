// Edge Function: registrar-embarque
// Recebe { device_token, uid } do ESP32 e grava o embarque.
// Deploy (o ESP32 não tem login, a autenticação é o device_token):
//   supabase functions deploy registrar-embarque --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);

  const { device_token, uid } = await req.json().catch(() => ({}));
  if (!device_token || !uid) {
    return json({ erro: "device_token e uid são obrigatórios" }, 400);
  }

  // A service role só existe aqui no servidor, nunca no ESP32.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Descobre a van pelo token do aparelho
  const { data: van } = await supabase
    .from("vans")
    .select("id")
    .eq("device_token", device_token)
    .maybeSingle();
  if (!van) return json({ erro: "Aparelho não reconhecido" }, 401);

  // 2) Confere se o cartão pertence a um aluno desta van
  const uidNormalizado = String(uid).toUpperCase();
  const { data: cartao } = await supabase
    .from("cartoes")
    .select("aluno_id")
    .eq("uid", uidNormalizado)
    .eq("van_id", van.id)
    .maybeSingle();
  if (!cartao) return json({ erro: "Cartão não cadastrado nesta van" }, 404);

  // 3) Grava o embarque (o app do motorista recebe via Realtime)
  const { error } = await supabase.from("embarques").insert({
    van_id: van.id,
    aluno_id: cartao.aluno_id,
    cartao_uid: uidNormalizado,
  });
  if (error) return json({ erro: "Falha ao gravar embarque" }, 500);

  return json({ ok: true });
});
