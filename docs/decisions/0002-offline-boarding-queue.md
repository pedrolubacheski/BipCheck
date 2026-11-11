# 0002: Fila offline de embarques no leitor

- **Data:** 10/11/2026
- **Status:** aceita
- **Decidido por:** Gabriel

## Contexto

A v1 do BipCheck deixava todo modo offline de fora: sem Wi-Fi, o leitor dava 3 bips de erro e a leitura se perdia.

O trabalho final da disciplina de IoT (Prof. Marcos, entrega até 23/11/2026) usa o BipCheck e exige, no requisito R2, uma regra de decisão executada no próprio dispositivo que continue funcionando sem internet. A única lógica local que existia era ignorar o mesmo cartão por 3 segundos, o que é fraco para cumprir o requisito.

Foram consideradas três opções:

1. **Só o filtro de toque repetido**, sem código novo. Risco alto de desconto no R2.
2. **Fila offline de embarques:** sem rede, o leitor guarda a leitura e envia depois.
3. **Fila offline + lista local de cartões autorizados:** o leitor também decidiria sozinho se o cartão é válido. Mais forte, mas exige sincronizar a lista de cartões com o servidor e cerca do dobro do tempo.

## Decisão

Adotar a opção 2, como exceção ao "modo offline fora da v1", valendo **só para o leitor**:

1. Quando o envio falha por falta de rede, servidor fora do ar (5xx) ou limite de requisições (429), o leitor guarda a leitura numa fila gravada na flash (NVS), com até 50 leituras, e dá **2 bips longos**. A fila sobrevive a um reinício do ESP32.
2. Com a fila cheia, a leitura nova é recusada com os 3 bips de erro. O leitor não apaga leituras antigas para abrir espaço.
3. Quando a rede volta, o leitor reenvia sozinho, uma leitura a cada 1,2 s (o servidor aceita 1 por segundo por leitor).
4. Recusa definitiva do servidor (cartão desconhecido, token inválido) não é reenviada.
5. A leitura reenviada leva `read_at`, o horário em que o cartão foi encostado (relógio do ESP32 ajustado por NTP). O banco grava o embarque com esse horário e recusa horário no futuro ou com mais de 12 horas (`invalid_read_at`).

O app continua sem modo offline. A lista local de cartões (opção 3) fica como evolução possível.

## Consequências

- O R2 do trabalho de IoT passa a ser demonstrável ao vivo: desligar o hotspot, encostar cartões, religar e ver os embarques chegarem.
- O leitor deixa de perder embarques em trechos sem sinal, o que também interessa ao produto.
- O payload ganhou um campo opcional (`read_at`) e a função `register_boarding` um parâmetro opcional. O firmware e a Edge Function antigos continuam compatíveis.
- Sem rede, o leitor **não sabe** se o cartão é válido: um cartão desconhecido recebe os 2 bips longos e só é recusado no reenvio (aparece em "Cartões lidos e não cadastrados").
- Leitura feita antes do primeiro ajuste do relógio (leitor ligado já sem rede) é reenviada sem `read_at` e fica com o horário do envio.
- Leituras com mais de 12 horas na fila são recusadas pelo servidor e se perdem. O limite existe para um token roubado não gravar embarques em datas antigas.
- Cada leitura guardada ou reenviada grava na flash. Para o volume de uma van (dezenas de leituras por dia) o desgaste é desprezível; se o volume crescer, vale agrupar as gravações.
- A implementação está no PR #12. O roteiro de hardware (itens 8 a 12 de `docs/testing/hardware-checklist.md`) ainda precisa ser executado no ESP32.
