# Roteiro ponta a ponta (manual)

Rode antes de apresentações e entregas, até os testes E2E com Playwright existirem. Use só dados fictícios.

| # | Quem | Ação | Esperado | ok? |
|---|------|------|----------|-----|
| 1 | Dono | Criar conta e criar a empresa | Cai na tela de Embarques com o aviso para cadastrar uma van | |
| 2 | Dono | Cadastrar uma van | Van aparece em "Vans" | |
| 3 | Motorista | Criar conta | Vê o aviso para pedir ao dono que o adicione | |
| 4 | Dono | Em "Equipe", adicionar o e-mail do motorista como Motorista; em "Vans", vincular o motorista | Motorista aparece na van | |
| 5 | Dono | Em "Leitores", cadastrar o leitor na van e copiar o token para o `secrets.h` | Token aparece uma única vez | |
| 6 | Dono | Cadastrar um aluno | Aluno aparece na lista | |
| 7 | Aluno | Encostar um cartão novo no leitor | 3 bips curtos; o cartão aparece em "Cartões lidos e não cadastrados" | |
| 8 | Dono | Vincular o cartão ao aluno | O cartão aparece no aluno | |
| 9 | Motorista | Abrir "Embarques" no celular | Vê só a(s) van(s) dele | |
| 10 | Aluno | Encostar o cartão | 1 bip longo no leitor; o nome aparece no app do motorista com bip em menos de 2 s | |
| 11 | Motorista | Tentar abrir `/students` pela URL | É mandado de volta para Embarques | |
| 12 | Outro dono | Criar outra empresa | Não vê nada da primeira empresa | |
