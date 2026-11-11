# BipCheck

Check-in de alunos em vans universitárias. O aluno encosta o cartão RFID no leitor (ESP32 + RC522), o embarque é gravado no Supabase, e o motorista vê em tempo real no app (PWA).

```
ESP32 --HTTPS {device_token, uid}--> Edge Function register-boarding
      --RPC--> register_boarding (Postgres) --Realtime--> app do motorista
```

Diagramas: [docs/diagrams/architecture.md](docs/diagrams/architecture.md) · Decisões: [docs/decisions/](docs/decisions/) · Histórico: [CHANGELOG.md](CHANGELOG.md)

## Estrutura

```
app/        PWA do motorista e do dono (React + Vite + TypeScript + Tailwind)
firmware/   leitor ESP32 (C++ com framework Arduino, via PlatformIO)
supabase/   migrações, testes do banco (pgTAP) e Edge Functions (Deno)
docs/       decisões, diagramas e roteiros de teste manual
```

## Pré-requisitos

- **Node.js 24.15 ou mais novo.** Com ele, `npm install` na raiz já traz o Deno e a CLI do Supabase.
- **VS Code + extensão PlatformIO**, só para quem mexe no firmware.
- Docker **não** é necessário: os testes de integração rodam na CI.

```
npm install            # na raiz: Deno + CLI do Supabase
npm --prefix app install
npm run check          # estáticos + unitários do app e das Edge Functions (o mesmo que a CI roda)
```

## 1. Supabase

Projeto: `xjqaxqorgzcvocgfbqrh` (us-east-1). Toda mudança de banco é feita por **migração** em `supabase/migrations/`.

```
npx supabase login
npx supabase link --project-ref xjqaxqorgzcvocgfbqrh
npx supabase db push                                             # aplica as migrações pendentes
npx supabase functions deploy register-boarding --no-verify-jwt  # publica a Edge Function
```

- O banco remoto só deve ser alterado depois de o PR passar na CI.
- Para criar uma migração nova: `npx supabase migration new nome_em_ingles`.
- Depois de mudar o banco, regenere os tipos do app:
  ```
  npx supabase gen types typescript --project-id xjqaxqorgzcvocgfbqrh > app/src/lib/database.types.ts
  ```

## 2. App

```
cd app
cp .env.example .env.local   # preencha URL e chave pública (Supabase > Project Settings > API)
npm run dev -- --host        # abre no PC e no celular pela mesma rede (endereço "Network")
```

| Comando | O que faz |
|---|---|
| `npm run check` | typecheck, lint, formatação, knip e testes unitários |
| `npm run test:coverage` | testes unitários com relatório de cobertura |
| `npm run format` | formata tudo com o Prettier |
| `npm run build` | build de produção |

### Primeiro uso

1. Crie a conta do dono e a empresa.
2. Cadastre uma van e o leitor. O token do leitor aparece **uma única vez**.
3. Cadastre os alunos. Para descobrir o UID de um cartão novo, encoste-o no leitor: ele aparece em "Cartões lidos e não cadastrados".
4. O motorista cria a conta. O dono adiciona o e-mail dele em "Equipe" e o vincula à van em "Vans".

## 3. Firmware

1. Abra a pasta `firmware/` no VS Code com a extensão PlatformIO.
2. Copie `include/secrets.example.h` para `include/secrets.h` e preencha:
   - Wi-Fi 2,4 GHz;
   - URL da função;
   - token do leitor.

   O `secrets.h` está no `.gitignore`: **nunca faça commit dele**.

```
pio run -t upload        # compila e grava no ESP32
pio device monitor       # Serial Monitor (115200)
pio test -e native       # testes da lógica pura, no PC
```

**Ligações:** RC522 SDA 21, RST 22, SCK 18, MISO 19, MOSI 23 (3V3). Buzzer ativo no GPIO 26.

**Sons:**
- 1 bip curtinho: cartão lido;
- 1 bip longo: embarque registrado;
- 2 bips longos: sem rede, leitura guardada no leitor (até 50) e enviada sozinha quando a rede voltar;
- 3 bips curtos: erro.

Roteiro de teste do leitor: [docs/testing/hardware-checklist.md](docs/testing/hardware-checklist.md).

## CI

A cada PR, o GitHub Actions roda:
- gitleaks;
- estáticos e unitários do app, das Edge Functions e do firmware;
- build do firmware;
- integração com o Supabase local: pgTAP, Edge Function e services do app.

PR com CI vermelha não deve ser mergeado.
