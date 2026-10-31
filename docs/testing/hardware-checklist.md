# Roteiro de teste do leitor (hardware)

Faça este roteiro sempre que mexer no firmware, antes de abrir o PR. A CI não tem ESP32: ela só compila e roda a lógica pura.

**Preparação**
- Leitor gravado com `pio run -t upload` e Serial Monitor aberto (`pio device monitor`).
- Cadastros no app: leitor ligado a uma van, um aluno com um cartão cadastrado e um cartão **não** cadastrado.
- Só dados fictícios.

| # | Ação | Esperado | ok? |
|---|------|----------|-----|
| 1 | Ligar o leitor | Serial mostra o motivo do reinício, "Wi-Fi conectado" e "Conexão aquecida: HTTP 405"; 1 bip | |
| 2 | Encostar o cartão cadastrado | Bip curtinho na hora; depois **1 bip longo**; o aluno aparece no app do motorista em menos de 2 s | |
| 3 | Encostar o mesmo cartão de novo em menos de 3 s | Nada acontece (o leitor ignora) | |
| 4 | Encostar de novo entre 3 s e 2 min | Bip curtinho + bip longo; **não** aparece um segundo embarque no app | |
| 5 | Encostar o cartão não cadastrado | Bip curtinho + **3 bips curtos**; o cartão aparece em "Cartões lidos e não cadastrados" | |
| 6 | Trocar o token do leitor no app e encostar um cartão | 3 bips curtos (HTTP 401) | |
| 7 | Tirar o leitor da van no app e encostar um cartão | 3 bips curtos (HTTP 409) | |
| 8 | Desligar o Wi-Fi (hotspot) e encostar um cartão | Bip curtinho; 3 bips curtos depois de até ~20 s; a leitura de outros cartões **não trava** | |
| 9 | Religar o Wi-Fi e encostar um cartão | Reconecta sozinho; 1 bip longo | |
| 10 | Encostar 5 cartões seguidos rapidamente | Todos recebem o bip curtinho na hora e o resultado depois, em ordem | |

**Tempos:** anote no PR o tempo do POST mostrado no Serial (`POST: HTTP 200 | XXX ms`). A meta é ficar abaixo de 1 s.
