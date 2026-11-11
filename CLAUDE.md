# BipCheck: contexto do projeto para o Claude Code

> Arquivo de memória do projeto. Coloque na raiz do repositório como `CLAUDE.md` (vale para toda a equipe)
> ou como `CLAUDE.local.md` (só para você, e fica fora do Git).
> Última atualização: 31/10/2026.

---

## 1. Regras de trabalho (leia antes de qualquer coisa)

- **Responda sempre em português do Brasil.** Comentários, commits, PRs e documentação também em português. **O código é em inglês** (tabelas, variáveis, funções, arquivos). Ver seção 7.3.
- **Toda implementação vem com testes de qualidade**, seguindo a pirâmide da seção 7.4. Rode estáticos e unitários antes de abrir o PR; a integração roda na CI.
- **Segurança e performance não são opcionais:** siga as seções 7.7 e 7.8 em toda implementação.
- **Siga a arquitetura da seção 7.** Para introduzir um padrão que não está lá, pergunte antes.
- **Git: nunca faça commit, push, criação de branch ou PR sem antes avisar o que pretende fazer e por quê, e esperar aprovação explícita.**
- **Autoria dos commits:** o autor é a pessoa que pediu o trabalho, nunca só o Claude. Para o Gabriel:
  ```
  git config user.name "Gabriel"
  git config user.email "gabrielmorais290921@gmail.com"
  ```
  O Claude entra apenas como `Co-Authored-By:` no fim da mensagem. Se o pedido vier de outra pessoa, pergunte nome e e-mail dela.
- **Supabase: nunca altere nada (SQL que escreve, migração, deploy, secrets) sem antes explicar o que vai rodar e qual o risco, e esperar aprovação.** Leitura é livre. Detalhes na seção 6.
- **Trello: crie cartões só quando pedirem.** Ler e atualizar os existentes é livre. Detalhes na seção 6.
- Trabalhe sempre em **branch separada** e entregue por **Pull Request**. Nada direto na `main`.
- **Ao fim de cada implementação, registre o que foi feito no `CHANGELOG.md`**, no mesmo PR, seguindo o modelo do topo do arquivo.
- **Descrição do PR:** preencha sempre seguindo `.github/pull_request_template.md` (o `gh pr create --body` não aplica o modelo sozinho). Só marque um item do checklist se ele foi de fato verificado.
- **Validar antes de construir.** O escopo da v1 é uma prova de conceito: ESP32 + Wi-Fi + RFID + PWA. Modo offline, escala e otimizações ficam **fora da v1**. Se uma tarefa puxar para fora disso, avise antes.
- **Separe sempre o que está Decidido do que é Hipótese** (ver seção 5). Não trate hipótese como requisito.
- **LGPD e privacidade:** dados de alunos (nome, cidade, horário de embarque, futuramente localização) são dados pessoais. Coleta mínima, RLS em toda tabela, nada de dados reais em commits, prints ou seeds. Embarques ficam 3 meses e logs de auditoria 30 dias (seção 7.7). Menores de idade estão fora do MVP; se o assunto aparecer, trate com cuidado redobrado.
- **A apresentação do evento (Start FAG) não pode ser gerada por IA.** O Claude pode ajudar com conteúdo, pesquisa e revisão, mas não montar os slides.
- **Segredos nunca entram no Git nem neste arquivo:** senha do Wi-Fi, `device_token`, `service_role`, senhas de usuários. Ver seção 8.

---

## 2. O produto

**BipCheck** é um sistema de check-in de alunos em vans universitárias.

- O aluno encosta uma **tag/cartão RFID** num **leitor ESP32** na porta da van (QR Code como alternativa de reserva).
- O **motorista** vê num **PWA**, em tempo real, quem embarcou.
- **Diferencial a validar:** a van no mapa e o aviso de chegada ao aluno (modelo casa a casa). Hoje os concorrentes são apps de carteirinha em rota fixa.
- Rotina real que inspirou o projeto: em Corbélia a van sai ~17h para buscar alunos, deixa a cidade ~18h, chega à FAG (Cascavel) ~18h50 e volta às 22h30. Piloto possível: Corbélia–Cascavel.
- Modelo de negócio pensado: mensalidade (manutenção/reposição de tags) + venda de kits de cartões.

É o projeto de **TCC** (entrega no final de 2027) e do **Start FAG** de um grupo de Engenharia de Software da FAG (Cascavel-PR). Também é usado como base para trabalhos de outras matérias (ex.: disciplina de IoT).

### Equipe
| Pessoa | Papel |
|---|---|
| Pedro Paulo Lubacheski | Dono da ideia; trabalha com React/JS; dono do repositório no GitHub e da conta do Supabase |
| Gabriel Silva de Morais | Sócio; está definindo a arquitetura de desenvolvimento |
| Kauê Correia de Oliveira | Sócio |
| Antonio Carlos Landim Francisco | Sócio |

**Orientador do TCC: ainda não definido.** A equipe pensa no Prof. Helder, mas não o trate como orientador até a confirmação. O Prof. Marcos é o professor da disciplina de IoT (turma T04N, 6º período), não o orientador.

---

## 3. Arquitetura atual (o que já funciona)

```
[Cartão RFID] -> [ESP32 + RC522] --HTTPS POST {device_token, uid}--> Edge Function "register-boarding" (Supabase)
     --RPC--> register_boarding (Postgres) --INSERT--> boardings --Realtime--> app do motorista (PWA)
```

- O ESP32 **não tem login**: ele se identifica pelo `device_token` do leitor (no banco fica só o hash SHA-256).
- A Edge Function usa a `service_role` (só no servidor) e chama a RPC numa única ida ao banco.
- O app usa só a **chave pública** do Supabase; quem protege os dados é a **RLS**.
- Tempo do bip ao registro no protótipo: ~0,25 a 0,57 s (banco e função em `us-east-1`, o firmware manda `x-region: us-east-1`).
- Diagramas: `docs/diagrams/architecture.md`. Decisão completa: `docs/decisions/0001-architecture.md`.

### Estrutura do repositório

```
README.md                         como montar e rodar tudo
CHANGELOG.md                      histórico de construção: cada implementação registra o que mudou
CLAUDE.md                         contexto e regras do projeto (este arquivo)
package.json                      ferramentas da raiz (Deno e CLI do Supabase via npm) e `npm run check`
.github/
  pull_request_template.md        modelo de descrição de PR, com checklist
  workflows/ci.yml                CI: gitleaks, estáticos, unitários, builds e integração
  dependabot.yml
app/                              PWA (React + Vite + TypeScript + Tailwind), ver seção 7.1
  src/app/                        rotas, layout e proteções de rota
  src/features/<feature>/         auth, companies, vans, devices, students, boardings
  src/shared/                     componentes, hooks e utilitários genéricos
  src/lib/                        cliente do Supabase e tipos do banco
firmware/                         PlatformIO
  platformio.ini                  ambientes esp32dev (placa) e native (testes no PC)
  include/                        config.h, root_ca.h, secrets.example.h (o secrets.h real fica fora do Git)
  lib/bipcheck_core/              lógica pura testável no PC (UID, payload, bips, debounce)
  src/                            main.cpp, api_client, card_reader, buzzer, wifi_connection
  test/test_core/                 testes Unity da lógica pura
supabase/
  config.toml                     configuração do Supabase local (CLI)
  migrations/                     esquema versionado (uma migração por arquivo, em ordem)
  tests/                          testes pgTAP (estrutura, isolamento, embarque, auditoria)
  functions/register-boarding/    Edge Function (handler testável separado do Deno.serve)
docs/
  decisions/                      ADRs
  diagrams/                       diagramas Mermaid
  testing/                        roteiros manuais (hardware, ponta a ponta)
```

### Banco (Supabase / Postgres)
| Tabela | Conteúdo |
|---|---|
| `companies` | empresa (dono de frota) |
| `company_members` | `user_id`, `email`, `role` (`owner` / `driver`) |
| `vans` | vans da empresa |
| `van_drivers` | motoristas vinculados a cada van |
| `devices` | leitores ESP32: `van_id`, `token_hash`, `last_seen_at` |
| `students` | `name`, `city` |
| `cards` | `uid` (hex maiúsculo, único por empresa), `student_id`, `active`; vale em qualquer van da empresa |
| `boardings` | `van_id`, `student_id`, `device_id`, `card_id`, `boarded_at` (Realtime; 3 meses) |
| `audit_logs` | quem fez o quê, sem dado pessoal (30 dias) |

- Todas com `company_id` e RLS. FKs compostas `(id, company_id)` impedem ligar registros de empresas diferentes.
- Funções (RPC): `create_company`, `add_company_member`, `create_device`, `rotate_device_token` (app) e `register_boarding` (só a Edge Function).
- **Status do `register_boarding`:**
  - `registered`: embarque gravado;
  - `duplicate`: mesmo aluno e van em menos de 2 min;
  - `invalid_device`: token não reconhecido;
  - `device_unassigned`: leitor sem van;
  - `unknown_card`: cartão não cadastrado ou desativado;
  - `invalid_read_at`: leitura reenviada com horário no futuro ou com mais de 12 horas;
  - `rate_limited`: mais de 1 requisição por segundo do mesmo leitor.

### Hardware
- ESP32 DevKit WROOM-32 (USB CP2102; no Windows precisa do driver CP210x, aparece como COM3) + leitor RC522 (Mifare 13,56 MHz).
- Pinos: SDA=GPIO21, RST=22, SCK=18, MISO=19, MOSI=23, alimentação 3V3. Buzzer ativo no GPIO 26. Sem LED e sem case por enquanto.
- Sons: 1 bip curtinho = cartão lido; 1 bip longo = embarque registrado; 2 bips longos = sem rede, leitura guardada; 3 bips curtos = erro.
- Fila offline (regra local, exigência do trabalho de IoT): sem rede, o leitor guarda até 50 leituras na flash (NVS) com o horário e reenvia quando a rede volta, mandando `read_at`. É a única parte de "offline" dentro do escopo; o app continua sem modo offline.
- Wi-Fi precisa ser 2,4 GHz (hoje pelo hotspot do celular).

---

## 4. Estado atual (31/10/2026)

- ✅ Projeto reconstruído no padrão da seção 7 (branch `feat/dev-architecture`): banco multi-tenant, Edge Function `register-boarding`, firmware no PlatformIO, app completo (cadastros + embarques em tempo real), testes e CI.
- ✅ Novo esquema aplicado no Supabase remoto e Edge Function `register-boarding` publicada (o esquema do protótipo saiu).
- ✅ Firmware novo gravado no ESP32, conectando pelo Wi-Fi de casa.
- ✅ **Primeira validação ponta a ponta (31/10/2026):** dono cadastrou empresa, van, motorista, aluno e leitor; o cartão desconhecido apareceu em "Cartões lidos e não cadastrados" (HTTP 404, 3 bips), foi vinculado ao aluno e o embarque seguinte apareceu sozinho no celular do motorista (HTTP 200, bip longo).
- ✅ Reconstrução mergeada na `main` (PR #3).
- ⏳ Falta no roteiro de hardware: toque repetido, leitor sem Wi-Fi e medir o tempo do bip até o registro (meta < 1 s).
- ⚠️ A senha do Wi-Fi e o `device_token` do protótipo aparecem no histórico do Git. Ambos deixam de valer: o Wi-Fi era só de teste e o token antigo some com o esquema do protótipo.

### Fora da v1 / próximos passos conhecidos
- Conceito de viagem (ida/volta) e exceções (aluno que vai numa van e volta em outra, aluno que só volta).
- Tela de auditoria completa para o dono (hoje a auditoria aparece só em "Cartões lidos e não cadastrados").
- Modo offline do leitor, hospedagem do PWA, MFA (antes do primeiro cliente real), testes E2E com Playwright.

---

## 5. Decidido x Hipótese

### Decidido
- Backend e banco: **Supabase** (Postgres + Auth + Edge Functions + Realtime).
- ESP32 envia `device_token` + UID por HTTPS.
- App (PWA do motorista e do dono) em **React + Vite + TypeScript**, organizado por feature (seção 7).
- **Multi-tenant** desde o início: cada dono de frota é uma empresa, com dados separados por RLS. Meta: virar SaaS em ~2 anos.
- Código em inglês; comentários, commits e documentação em português.
- Linguagens: TypeScript (app e Edge Functions), SQL/PL-pgSQL (banco) e C++ com framework Arduino via PlatformIO (firmware).
- Dono cadastra várias vans e motoristas; motorista vinculado a uma van recebe só as notificações dela.
- Cadastro de RFID por van; check-in por RFID com QR Code como reserva; embarque em tempo real no PWA.
- Modelo: mensalidade + venda de kits de cartões.
- Menores de idade fora do MVP. LED fora por enquanto (só buzzer).

### Hipóteses (não implementar como certo sem validar)
- Van no mapa via GPS do celular do motorista e aviso de chegada ao aluno.
- Recálculo de rota.
- WhatsApp oficial para o aluno avisar "vou hoje" / "não vou hoje".

### Em aberto
- Hospedagem do PWA; APIs de mapa e de WhatsApp; preço e quem paga.
- Exceções de uso: motorista novo, aluno que vai numa van e volta em outra, aluno que só volta, crianças.
- Riscos: amostra de pesquisa pequena e enviesada (6 respostas, todas de donos de frota), LGPD, custo do WhatsApp, motorista aceitar compartilhar GPS.

---

## 6. Conexões e como acessar

> Nenhum segredo fica aqui. Onde houver chave, este arquivo diz **onde** ela vai, não o valor.

### GitHub
- Repositório: https://github.com/pedrolubacheski/BipCheck (dono: Pedro). Também aparece como `pedrolubacheski/BipQueck`; é o mesmo repositório.
- Branches: `main` (estável) e as branches de trabalho no padrão da seção 7.6.
- Acesso local: `git` com a conta do GitHub de cada um. Para PRs pelo terminal, a CLI `gh` (`gh auth login`), se instalada.
- Lembre da regra da seção 1: avisar e esperar aprovação antes de commit/push/branch/PR.

### Supabase
- Painel: https://supabase.com/dashboard/project/xjqaxqorgzcvocgfbqrh (conta do Pedro; pedir acesso a ele).
- URL da API: `https://xjqaxqorgzcvocgfbqrh.supabase.co`.
- **Chave publishable/anon:** vai só no `app/.env.local` (copiar de `app/.env.example`). Pegar em Project Settings > API.
- **service_role:** nunca sai do Supabase. Só a Edge Function usa, via variável de ambiente do próprio Supabase.
- **device_token:** gerado pelo app em "Leitores" (aparece uma vez); vai só no `firmware/include/secrets.h`. No banco fica só o hash (`devices.token_hash`).
- CLI (vem com `npm install` na raiz): `npx supabase login`, `npx supabase link --project-ref xjqaxqorgzcvocgfbqrh`, `npx supabase db push` (aplica migrações), `npx supabase functions deploy register-boarding --no-verify-jwt`. Toda mudança de banco vai por migração em `supabase/migrations/` (seção 7.2), aplicada no remoto só depois da CI verde e com aprovação.
- **MCP do Supabase:** o Claude tem acesso total (conector do Supabase do claude.ai ou `claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=xjqaxqorgzcvocgfbqrh"`, autenticado com uma conta que tenha acesso ao projeto).
  - Consultas de leitura (listar tabelas, ver logs, advisors, `select`) podem ser feitas livremente.
  - **Qualquer coisa que altere o projeto** (SQL que escreve ou muda estrutura, migração, deploy de função, secrets, branches, pausar/restaurar) **só depois de perguntar**, explicando: o que vai rodar (o SQL ou comando exato), o que muda e qual o risco (perda de dados, quebra do ESP32 ou do app, exposição de dados). Esperar o "pode" explícito.
  - Toda mudança de estrutura do banco também precisa existir como arquivo SQL no repositório, para não ficar só no Supabase.

### Trello
- Quadro "BipCheck": https://trello.com/b/lgC2WYrU/bipcheck
- Listas: Backlog, Próximos (Semana), Em andamento, Revisão / Validação, Concluído, Decisões e Aprendizados.
- Etiquetas: Hardware, Software (PWA, backend), Equipe, Negócio, Pesquisa, Start FAG / TCC.
- É a **base de tarefas e anotações** do projeto. Toda tarefa vira cartão aqui. Decisões importantes vão para a lista "Decisões e Aprendizados".
- Acesso pelo Claude: conector do Trello (MCP). O Claude tem acesso total, com estas regras:
  - **Ler e interpretar** os cartões para entender tarefas, contexto e prioridades.
  - **Atualizar cartões já existentes** (mover de lista, comentar, marcar checklist, ajustar descrição) conforme o trabalho avança.
  - **Criar cartões só quando alguém pedir.** Os cartões são cadastrados pelos humanos; isso evita cartões inúteis.

### ESP32 / firmware
- **PlatformIO** (extensão do VS Code), pasta `firmware/`. Placa, framework e bibliotecas (MFRC522) ficam fixos no `platformio.ini`, então todo mundo compila igual.
  ```
  pio run -t upload            # compila e grava no ESP32 (no Windows aparece como COM3)
  pio device monitor           # Serial Monitor (115200)
  pio test -e native           # testes da lógica pura, no PC (sem ESP32)
  pio check -e esp32dev        # análise estática (cppcheck)
  ```
- Antes de compilar: copiar `include/secrets.example.h` para `include/secrets.h` e preencher. **Nunca commitar o `secrets.h`.**
- Teste no aparelho: roteiro em `docs/testing/hardware-checklist.md`.

### App
```
cd app
cp .env.example .env.local   # URL e chave pública do Supabase
npm install
npm run dev -- --host        # abre em http://localhost:5173 e no celular pelo IP mostrado em "Network"
npm run check                # typecheck, lint, formatação, knip e testes unitários
npm run build
```
Na raiz, `npm run check` roda as verificações locais do app e das Edge Functions (as mesmas da CI, menos a integração).

### Outros materiais
- Guia didático do projeto: https://claude.ai/artifact/Hwk5tuUNspsdppCkQPyxLT
- Proposta da disciplina de IoT (PDF de 2 páginas): fora do repositório, na pasta de arquivos do projeto (`iot-proposta/`).
- Pesquisa: formulário de motoristas (6 respostas) e formulário de alunos "Pesquisa: Rotina no Transporte Universitário".

---

## 7. Arquitetura de desenvolvimento

> Decidida em 31/10/2026 e aplicada no projeto inteiro na mesma data (ver `docs/decisions/0001-architecture.md`).
> Objetivo: simples de entender e manter hoje, preparado para virar **SaaS** em ~2 anos sem precisar jogar nada fora.
> Para introduzir um padrão que não está aqui, **pergunte antes**.

### 7.1 Padrão de arquitetura

**Monorepo** com as três partes e a documentação:
```
app/            PWA do motorista e do dono (React + Vite + TypeScript)
firmware/       ESP32 (C++ com framework Arduino, via PlatformIO)
supabase/
  migrations/   mudanças do banco versionadas (Supabase CLI), uma por arquivo, em ordem
  functions/    Edge Functions (Deno + TypeScript)
  tests/        testes do banco (RLS e funções)
docs/
  decisions/    registro de decisões (ADRs)
  diagrams/     diagramas em Mermaid
  testing/      roteiros de teste manual (hardware, ponta a ponta)
.github/workflows/  CI (GitHub Actions)
```

**App organizado por feature** (cada funcionalidade com sua pasta):
```
app/src/
  app/              rotas, layout, providers, autenticação
  features/
    boardings/      components/  hooks/  services/  types.ts
    vans/
    students/
  shared/           componentes e utilitários genéricos (Button, Input, formatDate...)
  lib/supabase.ts   cliente do Supabase e tipos gerados do banco
```

**Regras da arquitetura:**
- **Componentes nunca chamam o Supabase direto.** Só os `services/` de cada feature acessam o banco. Assim, trocar ou expandir o backend no futuro mexe só nessa camada.
- **A tela nunca recebe a linha crua do banco**, só o tipo da feature (`types.ts`). Quando o formato do banco e o da tela forem diferentes, o service converte com uma função simples (`toStudent(row)`).
- **Cada feature tem um `index.ts` com a sua API pública.** Outras features e o `app/` importam só de `@/features/<feature>/index.ts`, nunca de arquivos internos. O que for genérico vai para `shared/`.
- Contextos de feature (ex.: usuário logado, empresa atual) ficam na própria feature (`AuthContext`, `CompanyContext`) e são expostos pelo `index.ts`.
- Os hooks (`useBoardings`, `useVans`) ligam services e componentes (carregamento, erro, Realtime).

**Equivalência com a arquitetura em camadas clássica** (Controller/Service/Repository/DTO/Mapper). Usamos a versão leve, porque o Supabase já é o servidor:

| Padrão clássico | No BipCheck |
|---|---|
| Repository | `features/*/services/`: única camada que chama o Supabase |
| DTO | tipos gerados pelo Supabase a partir do banco (`Database['public']['Tables'][...]['Row']`) |
| Entity/Model | `types.ts` de cada feature |
| Mapper | função de conversão no service, **só quando** os formatos forem diferentes |
| Service (regra de negócio) | banco (RPC + RLS) e Edge Functions |

Se um dia o SaaS precisar de **backend próprio** (ex.: NestJS) para regras complexas ou API pública, aí adotamos o padrão completo. Com os services isolados, só essa camada muda.

**Onde fica cada regra:**
- **Banco (RPC + RLS):** regra que precisa ser confiável e não pode ser contornada: quem vê o quê, validação e registro de embarque.
- **Edge Functions:** ponte com o mundo externo: ESP32 hoje; WhatsApp, pagamentos e webhooks no futuro.
- **Front:** exibir e coletar dados. Nunca é a única barreira de segurança.

**Multi-tenant desde o início (base do SaaS):**
- Cada dono de frota é uma **empresa** (tenant). Toda tabela de dados tem `company_id`.
- A RLS filtra por empresa e pelo **papel** da pessoa na empresa (dono, motorista).
- Fazer agora custa pouco; migrar depois, com clientes reais, seria caro. O novo banco também resolve as pendências da seção 4 (cartão preso a uma van, motoristas por van, viagens).

### 7.2 Linguagem e ferramentas

**Linguagens** (3 no total; todo o grupo precisa dominar TypeScript e SQL, o C++ fica com quem cuidar do hardware):

| Parte | Linguagem |
|---|---|
| App | TypeScript (TSX + classes do Tailwind) |
| Edge Functions | TypeScript (Deno), a mesma do app |
| Banco | SQL; PL/pgSQL nas funções quando a lógica não couber em SQL puro |
| Firmware | C++ com framework Arduino, compilado pelo **PlatformIO**. Funções do ESP-IDF podem ser usadas dentro do framework Arduino se o produto exigir (bateria, atualização remota), sem reescrever |

- **TypeScript** em modo `strict`. Tipos do banco gerados com `npx supabase gen types typescript`.
- **Firmware dividido em módulos** (ex.: `wifi.cpp`, `reader.cpp`, `api.cpp`, `buzzer.cpp`), não um único `.ino`.
- **Estado:** só React (`useState`, `useContext`, hooks próprios) na v1. Biblioteca só se surgir necessidade real, perguntando antes.
- **Roteamento:** React Router.
- **Estilo:** Tailwind CSS.
- **PWA:** na v1 só o **manifest** (para instalar no celular). Service worker e modo offline ficam fora da v1.
- **Banco:** mudanças **só por migração** em `supabase/migrations/` (Supabase CLI). Nada de alterar estrutura pelo painel sem a migração correspondente no repositório.

### 7.3 Padrões de código
> Regra geral: seguir a convenção que cada ferramenta já pede (React, Postgres, TypeScript).

- **Idioma:**
  - **Código em inglês:** tabelas, colunas, funções SQL, variáveis, funções, componentes, pastas e arquivos (ex.: `students`, `register_boarding`, `BoardingList.tsx`, `features/boardings/`).
  - **Em português:** comentários, mensagens de commit, PRs, `CHANGELOG.md`, `CLAUDE.md`, `docs/` e textos que aparecem para o usuário na tela.
  - O código do protótipo (em português) foi substituído na reconstrução; não reintroduza nomes em português no código.
- **Componentes:** PascalCase, um componente por arquivo, `.tsx` (ex.: `BoardingList.tsx`). Hooks com prefixo `use`, em camelCase (ex.: `useBoardings.ts`).
- **Outros arquivos:** camelCase (ex.: `boardingService.ts`, `formatDate.ts`).
- **Exportação:** só `export` nomeado, nunca `export default` (evita o mesmo item importado com nomes diferentes). Exceção: arquivos de configuração que exigem default (ex.: `vite.config.ts`).
- **Imports:** com alias `@/` apontando para `app/src/` (ex.: `import { supabase } from '@/lib/supabase'`), em vez de `../../../`.
- **Tratamento de erro:**
  - Os **services lançam exceção** quando o Supabase devolve `error` (convertem `{ data, error }` em `throw`), com mensagem clara.
  - Os **hooks** capturam e expõem `{ data, loading, error }` para a tela.
  - A **tela** mostra uma mensagem amigável em português e nunca exibe o erro técnico cru.
- **Banco:** tabelas no plural, `snake_case`, chave primária `id`, datas `created_at`/`updated_at`, **RLS obrigatória em toda tabela**.
- **Lint e formatação:** oxlint + Prettier.
- **Comentários:** só onde o porquê não é óbvio, em português.

### 7.4 Testes
**Pirâmide de testes**, de baixo para cima: estáticos → unitários → integração → E2E. Testar mais onde o erro custa mais caro: no BipCheck, o banco (RLS e RPC) vem primeiro.

**Onde roda:** tudo roda na **CI (GitHub Actions)** em todo PR e push na `main`. Os notebooks da equipe não rodam Docker, então:
- **Localmente:** estáticos e unitários (rápidos, sem Docker).
- **Só na CI:** integração, que precisa do Supabase local (`supabase start`, com Docker, que o runner do GitHub já tem).
- **Nunca** testar contra o banco de produção, e não existe projeto Supabase separado para testes.
- PR com a CI vermelha não deve ser mergeado (não há bloqueio configurado no GitHub; é combinado da equipe).

#### 1. Estáticos (base)
| Verificação | App (TS) | Edge Functions (Deno) | Banco (SQL) | Firmware (C++) |
|---|---|---|---|---|
| Tipos | `tsc --noEmit` (strict) | `deno check` | tipos gerados (`supabase gen types`); se o banco mudar e o código não, o `tsc` acusa | compilador com `-Wall -Werror` |
| Lint | oxlint | `deno lint` | `supabase db lint` (plpgsql_check) e advisors do Supabase (tabela sem RLS, índice faltando) | `pio check` (cppcheck/clang-tidy) |
| Formatação | Prettier `--check` | `deno fmt --check` | (opcional) | clang-format |
| Dependências | `npm audit` e knip (dependências e código não usados) | versões fixas no `deno.json` | n/a | versões fixas no `platformio.ini` |
| Cobertura | Vitest coverage (v8) | `deno test --coverage` | n/a | gcovr no ambiente `native` (opcional) |

- **gitleaks** no repositório inteiro: procura senhas, tokens e chaves.
- **Cobertura é medida, sem meta de %.** O relatório serve para achar código importante sem teste, não para bater número.
- Um script na raiz roda toda a base de uma vez (ex.: `npm run check`).

#### 2. Unitários
| Parte | Ferramenta | O que testar |
|---|---|---|
| App | Vitest + Testing Library | mappers, utilitários, hooks (com service simulado), componentes isolados |
| Edge Functions | `deno test` | lógica separada do `Deno.serve` (validação do corpo, montagem da resposta) |
| Firmware | Unity via `pio test -e native` | lógica pura no PC, sem ESP32: formatar UID, montar JSON, interpretar resposta, padrão de bips |

Os arquivos de teste ficam **ao lado do arquivo testado** (`boardingService.ts` → `boardingService.test.ts`).

**Regras de qualidade (valem para unitários e integração):**
- **Qualidade acima de quantidade.** Não escreva teste que não protege nada (getter, constante, biblioteca de terceiros).
- **Independentes:** cada teste cria os próprios dados; nenhum depende de outro nem da ordem de execução.
- **Determinísticos:** sem depender de relógio, rede ou acaso; usar fake timers quando houver data.
- **Testar comportamento, não implementação:** "dado este cartão, a resposta é X", não "chamou a função interna Y". Refatorar não deve quebrar teste.
- **Mock só na fronteira** (Supabase, rede, hardware), nunca em peças internas do próprio código.
- **Padrão AAA** (preparar, executar, verificar), um comportamento por teste.
- **Descrição do teste em português**, como frase do comportamento esperado (ex.: `it('não registra embarque com cartão desconhecido')`). O restante do código do teste segue a regra de inglês.
- **Todo bug corrigido vem com um teste que o reproduz.**

#### 3. Integração (só na CI)
Contra o **Supabase local** subido na CI (Postgres, Auth e Edge Functions reais):

| O que | Ferramenta | Exemplos |
|---|---|---|
| Banco: RLS e RPC | pgTAP (`supabase test db`), em `supabase/tests/` | empresa A não vê dados da empresa B; motorista só vê a van dele; `register_boarding` com cartão válido, desconhecido e repetido |
| Services do app + banco | Vitest (config de integração separada), cliente real do Supabase, sem mock | `studentService` cria e lista alunos respeitando a RLS do usuário logado |
| Edge Function + banco | `deno test` chamando a função por HTTP (`supabase functions serve`) | `device_token` inválido → 401; POST válido grava em `boardings` |

- **Toda tabela nova e toda política de RLS entram junto com o teste delas.** Toda RPC tem teste.
- **Isolamento:** `supabase db reset` antes da suíte (migrações + seed com **dados fictícios**, nunca reais); o pgTAP roda cada arquivo numa transação desfeita no fim.
- **Hardware:** não roda na CI. `pio test` na placa e roteiro manual em `docs/testing/hardware-checklist.md` (cartão válido, não cadastrado, sem Wi-Fi, servidor fora, toque repetido; conferir bip e tempo).

#### 4. E2E (depois)
- **Playwright**, quando a equipe decidir começar (não é necessário agora). Também rodará na CI.
- Até lá: roteiro manual ponta a ponta (cartão → bip → embarque no app) em `docs/testing/`, antes de apresentações e entregas.

#### Critério para aceitar um PR
CI verde, checklist do modelo de PR completo e outro sócio revisou.

### 7.5 Documentação
- **Nomes de pastas e arquivos em inglês; conteúdo em português.**
- **Decisões:** em `docs/decisions/`, um arquivo por decisão (`0001-architecture.md`) com contexto, decisão e consequências. A lista "Decisões e Aprendizados" do Trello aponta para o arquivo.
- **Diagramas:** em Mermaid, dentro de `docs/diagrams/` (o GitHub renderiza e dá para versionar). Servem de base para o TCC.
- **Histórico de construção:** `CHANGELOG.md`.
- **Como rodar cada parte:** `README.md`.

### 7.6 Git e fluxo de trabalho
- **Branch:** em inglês, `type/short-description`, com tipo `feat`, `fix`, `docs`, `chore`, `refactor` ou `perf` (ex.: `feat/student-registration`).
- **Commit:** `tipo: descrição em português` (ex.: `feat: adiciona cadastro de alunos`).
- **Revisão:** qualquer outro sócio pode revisar. Depois da aprovação, quem abriu o PR faz o merge.
- **Trello:** se a tarefa tiver cartão, coloque o link no PR e mova o cartão. Não é obrigatório ter cartão.

### 7.7 Segurança

**Autenticação e autorização**
- Login só pelo **Supabase Auth** (e-mail e senha). Nunca criar login próprio.
- **RLS em toda tabela**, filtrando por `company_id` e pelo papel do usuário. O front nunca é a barreira de segurança.
- Funções SQL `security definer`: sempre com `set search_path = ''` e `revoke execute ... from public, anon` (liberar só para quem precisa).
- A `service_role` só existe nas Edge Functions, nunca no app nem no firmware.
- **MFA (código de 2 fatores):** fora por enquanto. **Obrigatório para o dono da empresa antes do primeiro cliente real.**

**Dispositivo (ESP32)**
- **Validar o certificado do servidor** (pacote de certificados raiz do ESP32). Nada de `setInsecure()` no firmware reconstruído.
- **O `device_token` é guardado no banco só como hash**, como senha. Deve ser possível **trocar o token pelo app** quando um leitor for perdido ou roubado.
- O token nunca aparece em log, Serial Monitor ou print.

**Entrada de dados e API**
- **Validar todo dado que entra com Zod**, no app e nas Edge Functions (formato esperado; o resto é rejeitado).
- **Limite de requisições** na Edge Function, por leitor e por IP (ex.: 1 requisição por segundo por leitor).
- Erros para fora são genéricos ("cartão não autorizado"); o detalhe técnico vai só para o log.
- CORS da Edge Function liberado só para o domínio do app.

**Front-end**
- Nunca usar `dangerouslySetInnerHTML`.
- Cabeçalhos de segurança (CSP e afins) na hospedagem, quando ela for definida.

**Dependências e segredos**
- `npm audit` e gitleaks na CI (seção 7.4).
- **Dependabot** ativado no GitHub: abre PR quando uma dependência tem vulnerabilidade (só avisa, não bloqueia).

**LGPD e retenção de dados**
- Coleta mínima: só o necessário para o embarque funcionar.
- Logs e auditoria não guardam dado pessoal (nome, cidade); usam só ids.
- Apagar um aluno apaga os dados dele em cascata (direito de exclusão).
- **Histórico de embarques: guardado por 3 meses.** O que for mais antigo é apagado automaticamente (job diário com `pg_cron`).

**Auditoria e logs**
- **Tudo que é relevante fica registrado** numa tabela `audit_logs`: quem (`user_id` ou leitor), o quê (`action`, ex.: `student.created`, `device_token.rotated`), em qual registro (`entity`, `entity_id`), empresa (`company_id`) e quando (`created_at`). Inclui eventos de segurança, como token inválido e login falho.
- O registro é feito **pelo banco** (triggers e funções), não pelo front, para não dar para pular.
- RLS: o dono lê a auditoria da própria empresa; ninguém altera nem apaga registros pelo app.
- **Retenção: 30 dias.** Um job diário com `pg_cron` apaga o que tiver mais de 30 dias, para o log não encher o banco.

### 7.8 Performance

**Regra de ouro: medir antes de otimizar.** Definir metas, medir, e só otimizar o que estiver fora da meta.

**Metas**
| O que | Meta |
|---|---|
| Bip até o registro no banco | < 1 s em 95% dos casos |
| Embarque aparecer no app do motorista | < 2 s depois do bip |
| App abrir no celular em 4G | < 3 s |

**Banco**
- **Índice em toda chave estrangeira e em `company_id`** (a RLS filtra por essas colunas em toda consulta).
- Na RLS, usar `(select auth.uid())` em vez de `auth.uid()` (calculado uma vez por consulta, não por linha; recomendação oficial do Supabase).
- Uma ida ao banco por operação (RPC).
- Nunca `select *`: buscar só as colunas usadas. Listas grandes sempre paginadas.

**App**
- O Realtime escuta **só a van atual** (filtro por `van_id`), nunca a tabela inteira.
- Rotas com carregamento sob demanda (*lazy loading*): o motorista não baixa o código das telas do dono.
- Medir com o **Lighthouse** antes de cada entrega.

**Firmware**
- Manter a conexão HTTPS aberta entre leituras.
- A leitura do cartão nunca trava esperando a rede (nada de `delay()` ou POST bloqueando o leitor).

### 7.9 Skills e comandos do Claude Code
Ficam para o fim, depois que a arquitetura, os padrões e os testes estiverem definidos. Ideias:
- Nova migração SQL (com RLS obrigatória e revisão de LGPD)
- Nova feature do app seguindo a 7.1
- Gravar e testar o firmware pelo Arduino CLI
- Preparar PR (CHANGELOG, modelo de PR, cartão do Trello, checklist de segredos)

---

## 8. Checklist de segredos (antes de qualquer commit)

- [ ] Nenhum `secrets.h`, `.env`, `.env.local` no diff.
- [ ] Nenhuma senha de Wi-Fi, `device_token`, `service_role` ou senha de usuário em código, comentário, README ou print.
- [ ] Nenhum dado real de aluno (nome, cidade) em seeds, testes ou exemplos.
- [ ] Se algo vazou: avisar a equipe e **trocar a credencial**; apagar do código não basta, porque fica no histórico do Git.
