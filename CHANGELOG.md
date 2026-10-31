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
