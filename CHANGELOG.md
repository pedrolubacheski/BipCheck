# Changelog do BipCheck

Histórico de construção do projeto. Ao terminar cada implementação, quem fez registra aqui o que mudou.

## Como registrar

- A entrada mais nova fica **no topo**.
- Uma entrada por implementação (normalmente um PR), escrita **no mesmo PR** da mudança.
- Escreva o que mudou para quem usa ou mantém o projeto, não a lista de arquivos (isso o Git já mostra).
- Inclua o **porquê** quando a decisão não for óbvia, e o que ficou pendente.
- Coisas testadas e descartadas também entram: fazem parte do histórico.
- **Nada de segredos nem dados reais de alunos** (ver seção 8 do `CLAUDE.md`).

Categorias (use só as que se aplicam): **Adicionado**, **Alterado**, **Corrigido**, **Removido**, **Descartado**, **Segurança**.

Modelo:

```markdown
## AAAA-MM-DD: Título curto da implementação
**Autor:** Nome · **PR:** #N · **Área:** Firmware | Banco | Edge Function | App | Docs

### Adicionado
- ...

### Pendente
- ...
```

---

## 2026-11-11: Fila offline de embarques no leitor
**Autor:** Gabriel · **Área:** Firmware, Banco, Edge Function, Docs

O trabalho final de IoT exige uma regra de decisão no próprio dispositivo que funcione sem internet (requisito R2). Até aqui, sem Wi-Fi o leitor dava 3 bips de erro e a leitura se perdia. Agora o leitor decide sozinho o que fazer com a leitura quando a rede falha. É uma exceção consciente ao "modo offline fora da v1": vale só para o leitor.

### Adicionado
- **Firmware:**
  - sem Wi-Fi, servidor fora do ar ou limite de requisições, a leitura vai para uma fila gravada na flash (NVS), com até 50 leituras, que sobrevive a um reinício do ESP32;
  - **2 bips longos** avisam que a leitura foi guardada; fila cheia dá os 3 bips de erro;
  - quando a rede volta, as leituras são reenviadas sozinhas, uma a cada 1,2 s (o servidor aceita 1 por segundo por leitor);
  - relógio ajustado por NTP: a leitura reenviada leva `read_at` com o horário em que o cartão foi encostado.
- **Banco:** `register_boarding` aceita `p_read_at` (opcional) e grava o embarque com esse horário. Horário no futuro ou com mais de 12 horas devolve o status novo `invalid_read_at`.
- **Edge Function:** valida `read_at` com Zod e responde HTTP 422 para `invalid_read_at`.
- Testes: fila, horário e bips (Unity), `read_at` na função (Deno) e no banco (pgTAP).

### Alterado
- O leitor não espera mais o Wi-Fi conectar (antes travava a tarefa de rede por até 20 s): sem rede, a decisão é imediata.
- Toque repetido passa a comparar com o horário da leitura, não com o horário do envio.
- Recusa definitiva do servidor (cartão desconhecido, token inválido) não é reenviada; só falha de rede, 429 e 5xx.

### Pendente
- Aplicar a migração `20261111120000_register_boarding_read_at.sql` e publicar a Edge Function no Supabase remoto (depois da CI verde e com aprovação). O firmware novo funciona com o servidor antigo, mas o embarque reenviado fica com o horário do envio até lá.
- Rodar o roteiro `docs/testing/hardware-checklist.md` no ESP32 (itens 8 a 12 são novos).
- Leitura feita antes do primeiro ajuste do relógio (leitor ligado já sem rede) é reenviada sem `read_at` e fica com o horário do envio.

---

## 2026-10-31: Primeira validação ponta a ponta
**Autor:** Gabriel · **Área:** Docs

Primeiro teste completo do sistema reconstruído, com o banco aplicado no Supabase remoto e o firmware novo gravado no ESP32. Nenhum código mudou.

### Validado
- Dono cria empresa e van no app (notebook); motorista cria conta no celular, é adicionado na Equipe e vinculado à van.
- Leitor cadastrado no app; token colocado no `secrets.h`; ESP32 conecta no Wi-Fi e aquece a conexão HTTPS.
- Cartão não cadastrado: leitor recebe HTTP 404 e dá 3 bips; o cartão aparece em "Cartões lidos e não cadastrados" e é vinculado ao aluno.
- Cartão cadastrado: HTTP 200, bip longo, e o embarque aparece sozinho (Realtime) na tela do motorista no celular.

### Pendente
- Resto do roteiro `docs/testing/hardware-checklist.md`: toque repetido e leitor sem Wi-Fi.
- Medir o tempo do bip até o registro (meta < 1 s).
- Regras de negócio (viagens ida/volta e exceções) ficam para outra etapa.

---

## 2026-10-31: Reconstrução do projeto no padrão definido
**Autor:** Gabriel · **Área:** Banco, Edge Function, Firmware, App, Docs

O protótipo foi reconstruído seguindo as decisões do `CLAUDE.md` (resumo em `docs/decisions/0001-architecture.md`).

### Adicionado
- **Banco multi-tenant** (`supabase/migrations/`):
  - empresas, membros com papel (dono/motorista), vans, motoristas por van, leitores, alunos, cartões e embarques;
  - RLS em toda tabela, FKs compostas impedindo mistura entre empresas, índices em toda FK.
- **Funções:**
  - `create_company`, `add_company_member`, `create_device` e `rotate_device_token`;
  - `register_boarding`, que trata toque repetido (2 min), limite de 1 requisição por segundo por leitor, cartão desativado e leitor sem van.
- **Auditoria** (`audit_logs`), gravada por triggers, sem dado pessoal. **Retenção** com pg_cron: embarques 3 meses, auditoria 30 dias.
- **Edge Function `register-boarding`:** validação com Zod, limite por IP, erros genéricos e logs sem token.
- **Firmware no PlatformIO, em módulos:**
  - valida o certificado do servidor (raízes GTS);
  - leitura e rede em tarefas separadas, então o leitor não trava sem internet;
  - bip sem `delay`;
  - ignora o mesmo cartão por 3 s.
- **App** (React + TypeScript + Tailwind, por feature):
  - login e cadastro, criação de empresa, equipe;
  - vans e motoristas, leitores (token mostrado uma vez e troca de token);
  - alunos e cartões, com "cartões lidos e não cadastrados";
  - embarques em tempo real com bip;
  - manifest do PWA.
- **Testes:**
  - pgTAP (estrutura, isolamento entre empresas, embarque, auditoria e retenção);
  - `deno test` (Edge Function, unitários e integração);
  - Vitest (app, unitários e integração);
  - Unity (lógica do firmware no PC).
- **CI no GitHub Actions** (gitleaks, estáticos, unitários, builds e integração com Supabase local) e **Dependabot**.
- **Documentação:** ADR 0001, diagramas Mermaid e roteiros de teste manual (`docs/testing/`).

### Alterado
- Código renomeado para inglês (`registrar-embarque` → `register-boarding`, `segredos.h` → `secrets.h`).
- `device_token` guardado só como hash SHA-256.

### Removido
- Esquema, função e firmware do protótipo (`schema.sql`, `passo2_registrar_embarque.sql`, `bipcheck_esp32.ino`). A migração `20261031120000_remove_prototype.sql` apaga as tabelas antigas, que só tinham dados de teste.

### Pendente
- Aplicar as migrações e publicar a função no Supabase remoto (precisa de aprovação, porque apaga os dados de teste do protótipo).
- Gravar o firmware novo no ESP32 com o token gerado pelo app e rodar `docs/testing/hardware-checklist.md`.
- Viagens (ida/volta), modo offline, tela de auditoria completa e hospedagem do PWA.

## 2026-10-31: Organização do projeto e decisões de arquitetura
**Autor:** Gabriel · **Área:** Docs

### Adicionado
- `CLAUDE.md` com o contexto e as regras do projeto: arquitetura por feature, multi-tenant, linguagens (TypeScript, SQL, C++ via PlatformIO), padrões de código, pirâmide de testes com CI, segurança, performance, auditoria e retenção de dados.
- `CHANGELOG.md` para registrar o histórico de construção.
- Modelo de PR (`.github/pull_request_template.md`) com checklist.
- `.gitattributes` padronizando quebra de linha em LF.

## 2026-10-30: Painel do motorista de teste (descartado)
**Autor:** Pedro Lubacheski / Gabriel · **PR:** #2 (fechado sem merge) · **Área:** App

### Descartado
- Painel em Vite + React 19 (login, escolha da van e lista de embarques em tempo real com bip no navegador), feito só para testar a interface no celular pela rede local.
- A interface foi testada e a equipe optou por não manter esse código no projeto. O painel definitivo será feito depois da definição da arquitetura (seção 7 do `CLAUDE.md`).

## 2026-10-30: Bip mais rápido e segredos fora do firmware
**Autor:** Gabriel · **PR:** #1 (`fix/esp-time`) · **Área:** Firmware, Banco, Edge Function

### Adicionado
- Função SQL `registrar_embarque` (`supabase/passo2_registrar_embarque.sql`): o registro passa a ser feito com uma só ida ao banco, em vez de três.
- `segredos.example.h` como modelo; Wi-Fi, URL da função e `device_token` agora ficam em `segredos.h`, fora do Git (`.gitignore`).
- Firmware mostra o motivo do último reinício e o tempo de cada etapa no Serial Monitor; timeout na conexão Wi-Fi.
- README com o passo a passo de configuração (Supabase e firmware).

### Alterado
- Firmware chama a função em `us-east-1`, mesma região do banco, e abre a conexão HTTPS já no `setup`. Tempo do bip ao registro caiu para cerca de 0,25 a 0,57 s.

### Corrigido
- `index.ts` da Edge Function tinha sido sobrescrito com o código do `.ino`; restaurado.

### Segurança
- A senha do Wi-Fi e o `device_token` continuam no histórico do Git (commits anteriores). **Pendente: trocar as duas credenciais.**

## 2026-10-30: Passo 1: banco, Edge Function e firmware
**Autor:** Pedro Lubacheski · **Área:** Banco, Edge Function, Firmware

### Adicionado
- `supabase/schema.sql`: tabelas `vans`, `alunos`, `cartoes` e `embarques`, com RLS em todas e Realtime em `embarques`.
- Edge Function `registrar-embarque`: recebe `{ device_token, uid }` do ESP32 e grava o embarque.
- Firmware do leitor (ESP32 + RC522 + buzzer): lê o UID do cartão, envia por HTTPS e responde com bips (curto = lido, longo = registrado, três curtos = erro).

## 2026-10-27: Início do repositório
**Autor:** Pedro Lubacheski

### Adicionado
- Repositório criado no GitHub.
