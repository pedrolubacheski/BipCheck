# 0001: Arquitetura do projeto

- **Data:** 31/10/2026
- **Status:** aceita
- **Decidido por:** Gabriel, com a equipe

## Contexto

O primeiro protótipo (ESP32 + Supabase + painel React em JavaScript) provou que o bip chega ao banco em menos de 1 segundo. Mas ele foi feito só para teste: nomes em português misturados, um único dono, nenhum teste automatizado, token do leitor em texto puro e certificado HTTPS sem validação.

O BipCheck é o TCC da equipe (entrega no fim de 2027) e a meta é virar um **SaaS em cerca de 2 anos**. Quatro pessoas vão mexer no código, quase sempre com a ajuda do Claude. A arquitetura precisava ser simples de entender e manter hoje, sem nada que precise ser jogado fora quando houver clientes.

## Decisão

1. **Monorepo** com `app/`, `firmware/`, `supabase/` e `docs/`.
2. **Supabase é o backend:**
   - a regra confiável fica no banco (RPC + RLS);
   - as Edge Functions fazem a ponte com o mundo externo (o ESP32 hoje);
   - o front só exibe e coleta dados.
3. **Multi-tenant desde o início:** cada dono de frota é uma empresa (`companies`), toda tabela tem `company_id`, e a RLS separa por empresa e por papel (dono, motorista). As FKs compostas `(id, company_id)` impedem ligar registros de empresas diferentes.
4. **App organizado por feature** (`features/boardings`, `students`...):
   - só os `services/` acessam o Supabase;
   - a tela nunca recebe a linha crua do banco;
   - cada feature expõe uma API pública em `index.ts`, e as outras importam só dali.

   É a versão leve da arquitetura em camadas (Repository/DTO/Mapper), porque o Supabase já é o servidor.
5. **Linguagens:** TypeScript (app e Edge Functions), SQL/PL-pgSQL (banco) e C++ com framework Arduino via PlatformIO (firmware). Código em inglês; comentários, commits e docs em português.
6. **Testes em pirâmide:**
   - estáticos;
   - unitários;
   - integração: Supabase local, só na CI, porque os notebooks não rodam Docker;
   - E2E depois.
7. **Segurança:**
   - `device_token` guardado só como hash, com troca pelo app;
   - certificado validado no ESP32;
   - Zod na entrada;
   - limite de requisições;
   - auditoria pelo banco, sem dado pessoal;
   - retenção de 3 meses (embarques) e 30 dias (auditoria).

## Consequências

**Ganhos**
- Trocar ou expandir o backend no futuro mexe só nos `services/`.
- O pior bug possível de um SaaS (uma empresa ver dados de outra) é coberto por testes de RLS na CI.
- Qualquer pessoa recria o banco do zero com as migrações.
- O leitor não trava esperando a rede: leitura e envio rodam em tarefas separadas.

**Custos**
- **O esquema do protótipo foi descartado.** A migração `20261031120000_remove_prototype.sql` apaga as tabelas antigas (só tinham dados de teste).
- **O firmware e os testes do banco só rodam na CI**, porque exigem PlatformIO e Docker. Localmente, cada pessoa roda os estáticos e unitários do app e das Edge Functions (`npm run check`).
- O limite por IP da Edge Function é em memória, por instância. É uma primeira barreira; o limite confiável (1 por segundo por leitor) fica no banco.

**Ficou para depois (fora da v1)**
- Viagens (ida e volta) e as exceções (aluno que vai numa van e volta em outra).
- Modo offline do leitor.
- MFA (obrigatório antes do primeiro cliente real).
- Hospedagem do PWA.
- Tela de auditoria completa.
