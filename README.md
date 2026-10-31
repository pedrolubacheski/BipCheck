# BipCheck

Check-in de alunos em vans universitárias: o aluno encosta o cartão RFID no leitor (ESP32 + RC522) e o embarque é gravado no Supabase, que avisa o app do motorista em tempo real.

```
ESP32 --HTTPS POST {device_token, uid}--> Edge Function "registrar-embarque"
      --RPC--> função SQL registrar_embarque --INSERT--> embarques --Realtime--> app do motorista
```

## 1. Supabase

1. No **SQL Editor**, rode `supabase/schema.sql` (tabelas, RLS e Realtime).
2. Depois rode `supabase/passo2_registrar_embarque.sql` (função que registra o embarque com uma só ida ao banco).
3. Publique a Edge Function `supabase/functions/registrar-embarque/index.ts`:
   - pela CLI: `supabase functions deploy registrar-embarque --no-verify-jwt`
   - ou pelo painel (Edge Functions), colando o código e **desligando "Verify JWT"**.
4. Cadastre uma van, um aluno e os cartões. O `device_token` da van fica na coluna `vans.device_token`.

O banco do projeto está em `us-east-1`, por isso o firmware pede a função nessa região (`x-region: us-east-1`).

## 2. Painel do motorista (React)

Veja `app/README.md`. Resumo: `cd app && npm install && npm run dev -- --host`, e abra no notebook ou no celular (mesmo Wi-Fi).

## 3. Firmware (Arduino IDE)

1. Instale o suporte ao ESP32 (Gerenciador de Placas: "esp32" da Espressif) e a biblioteca **MFRC522** (miguelbalboa).
2. Na pasta `firmware/bipcheck_esp32/`, copie `segredos.example.h` para `segredos.h` e preencha WiFi (2,4 GHz), URL da função e `device_token`. O `segredos.h` está no `.gitignore`: **nunca faça commit dele**.
3. Abra `bipcheck_esp32.ino`, escolha a placa "ESP32 Dev Module" e a porta, e clique em Upload.
4. Abra o Serial Monitor em 115200. Ao ligar ele mostra o motivo do último reinício e, a cada cartão, o tempo do POST em ms.

Ligações: RC522 SDA 21, RST 22, SCK 18, MISO 19, MOSI 23. Buzzer ativo no GPIO 26.

Sons: 1 bip curtinho = cartão lido; 1 bip longo = embarque registrado; 3 bips curtos = erro.
