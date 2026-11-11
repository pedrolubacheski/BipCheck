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
| 8 | Desligar o Wi-Fi (hotspot) e encostar o cartão cadastrado | Bip curtinho e logo depois **2 bips longos** (leitura guardada); Serial mostra "Sem rede: leitura guardada (1 na fila)"; nada aparece no app | |
| 9 | Ainda sem Wi-Fi, encostar outros cartões | Cada um recebe 2 bips longos na hora; a leitura **não trava** esperando a rede | |
| 10 | Ainda sem Wi-Fi, desligar e religar o leitor (tirar o USB) | Serial mostra "Fila offline carregada da flash: N leitura(s)" | |
| 11 | Religar o Wi-Fi e esperar | Reconecta sozinho; Serial mostra "Leitura offline reenviada: HTTP 200" para cada uma (uma a cada ~1,2 s); os embarques aparecem no app **com o horário em que o cartão foi encostado**; o cartão não cadastrado é reenviado com HTTP 404 e aparece em "Cartões lidos e não cadastrados" | |
| 12 | Com o Wi-Fi de volta, encostar um cartão | Bip curtinho + 1 bip longo | |
| 13 | Encostar 5 cartões seguidos rapidamente | Todos recebem o bip curtinho na hora e o resultado depois, em ordem (com mais de 1 por segundo, alguns podem dar 2 bips longos e ser enviados logo em seguida) | |

**Tempos:** anote no PR o tempo do POST mostrado no Serial (`POST: HTTP 200 | XXX ms`). A meta é ficar abaixo de 1 s.
