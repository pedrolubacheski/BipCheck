// BipCheck - firmware do leitor (ESP32 + RC522 + buzzer)
//
// Duas tarefas, para a leitura do cartão nunca travar esperando a rede:
//   loop() (núcleo 1): lê cartões, toca o buzzer e coloca o UID na fila
//   networkTask (núcleo 0): mantém o Wi-Fi, envia cada UID da fila e devolve o código HTTP
//
// Antes de compilar: copie include/secrets.example.h para include/secrets.h e preencha.

#include <Arduino.h>
#include <esp_system.h>

#include <cstdio>

#include "api_client.h"
#include "buzzer.h"
#include "card_debouncer.h"
#include "card_reader.h"
#include "config.h"
#include "feedback.h"
#include "wifi_connection.h"

namespace {

struct CardRead {
  char uid[21];  // até 10 bytes de UID em hexadecimal + '\0'
};

QueueHandle_t cardQueue;
QueueHandle_t resultQueue;  // códigos HTTP (int)

CardReader reader;
Buzzer buzzer(PIN_BUZZER);
ApiClient api;
bipcheck::CardDebouncer debouncer(SAME_CARD_DEBOUNCE_MS);

// Motivo do último reinício, para diagnosticar reinícios sozinhos
const char* resetReason() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "power-on (ligou na energia)";
    case ESP_RST_EXT: return "pino de reset externo";
    case ESP_RST_SW: return "software (ESP.restart)";
    case ESP_RST_PANIC: return "panic (erro no programa)";
    case ESP_RST_INT_WDT: return "watchdog de interrupção";
    case ESP_RST_TASK_WDT: return "watchdog de tarefa";
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_BROWNOUT: return "brownout (queda de tensão)";
    case ESP_RST_DEEPSLEEP: return "saiu do deep sleep";
    default: return "desconhecido";
  }
}

void networkTask(void*) {
  wifiBegin();
  if (wifiEnsureConnected()) {
    api.warmUp();
  }

  CardRead card;
  for (;;) {
    if (xQueueReceive(cardQueue, &card, portMAX_DELAY) != pdTRUE) {
      continue;
    }
    const int status = wifiEnsureConnected() ? api.postBoarding(card.uid) : -1;
    xQueueSend(resultQueue, &status, 0);
  }
}

}  // namespace

void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial.printf("\nMotivo do último reinício: %s\n", resetReason());

  buzzer.begin();
  reader.begin();
  api.begin();

  cardQueue = xQueueCreate(CARD_QUEUE_LENGTH, sizeof(CardRead));
  resultQueue = xQueueCreate(CARD_QUEUE_LENGTH, sizeof(int));
  // TLS precisa de pilha grande
  xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);

  Serial.println("Pronto. Encoste um cartão no leitor.");
  buzzer.play(bipcheck::BEEP_READY);
}

void loop() {
  std::string uid;
  if (reader.poll(uid) && debouncer.accept(uid, millis())) {
    CardRead card{};
    snprintf(card.uid, sizeof(card.uid), "%s", uid.c_str());
    if (xQueueSend(cardQueue, &card, 0) == pdTRUE) {
      Serial.printf("Cartão lido: %s\n", card.uid);
      buzzer.play(bipcheck::BEEP_CARD_READ);  // feedback imediato: o cartão foi lido
    } else {
      buzzer.play(bipcheck::BEEP_ERROR);  // fila cheia: rede muito lenta
    }
  }

  int status = 0;
  if (xQueueReceive(resultQueue, &status, 0) == pdTRUE) {
    buzzer.play(bipcheck::beepFor(bipcheck::feedbackForHttpStatus(status)));
  }

  buzzer.update();
  delay(5);  // cede o processador para outras tarefas (Wi-Fi) sem atrasar a leitura
}
