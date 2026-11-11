// BipCheck - firmware do leitor (ESP32 + RC522 + buzzer)
//
// Duas tarefas, para a leitura do cartão nunca travar esperando a rede:
//   loop() (núcleo 1): lê cartões, toca o buzzer e coloca o UID na fila
//   networkTask (núcleo 0): envia cada UID da fila e devolve o resultado para o bip
//
// Regra local (funciona sem internet): se o envio falhar por falta de rede, a leitura é guardada
// na flash com o horário (fila offline), o leitor dá 2 bips longos e reenvia quando a rede voltar.
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
#include "offline_queue.h"
#include "offline_store.h"
#include "timestamp.h"
#include "wifi_connection.h"

namespace {

struct CardRead {
  char uid[21];  // até 10 bytes de UID em hexadecimal + '\0'
};

QueueHandle_t cardQueue;
QueueHandle_t resultQueue;  // bipcheck::Feedback de cada leitura

CardReader reader;
Buzzer buzzer(PIN_BUZZER);
ApiClient api;
bipcheck::CardDebouncer debouncer(SAME_CARD_DEBOUNCE_MS);

// Usados só pela tarefa de rede
bipcheck::OfflineQueue offlineQueue(OFFLINE_QUEUE_CAPACITY);
OfflineStore offlineStore;
uint32_t lastPostAtMs = 0;

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

int postBoarding(const std::string& uid, uint32_t readAtEpoch = 0) {
  const int status = api.postBoarding(uid, readAtEpoch);
  lastPostAtMs = millis();
  return status;
}

// Leitura feita agora: tenta enviar; sem rede, guarda na fila offline. Devolve o bip a tocar.
bipcheck::Feedback handleRead(const CardRead& card) {
  // Sem Wi-Fi nem tenta enviar: a decisão é imediata, sem esperar a rede
  const int status = wifiIsConnected() ? postBoarding(card.uid) : -1;
  const bipcheck::SendOutcome outcome = bipcheck::classifySend(status);

  bool stored = false;
  if (outcome == bipcheck::SendOutcome::Retry) {
    const uint32_t now = clockNowEpoch();
    stored = offlineQueue.push(card.uid, bipcheck::isClockSet(now) ? now : 0);
    if (stored) {
      offlineStore.save(offlineQueue);
      Serial.printf("Sem rede: leitura guardada (%u na fila)\n", static_cast<unsigned>(offlineQueue.size()));
    } else {
      Serial.println("Sem rede e fila offline cheia: leitura perdida");
    }
  }
  return bipcheck::feedbackForRead(outcome, stored);
}

// Reenvia a leitura mais antiga da fila offline. true = saiu da fila (entregue ou recusada de vez).
bool resendOldest() {
  if (!wifiIsConnected()) {
    wifiRetry();
    return false;
  }
  const bipcheck::PendingBoarding& pending = offlineQueue.front();
  const int status = postBoarding(pending.uid, pending.readAtEpoch);
  if (bipcheck::classifySend(status) == bipcheck::SendOutcome::Retry) {
    return false;
  }
  offlineQueue.pop();
  offlineStore.save(offlineQueue);
  Serial.printf("Leitura offline reenviada: HTTP %d (%u na fila)\n", status,
                static_cast<unsigned>(offlineQueue.size()));
  return true;
}

void networkTask(void*) {
  offlineStore.load(offlineQueue);
  if (!offlineQueue.empty()) {
    Serial.printf("Fila offline carregada da flash: %u leitura(s)\n", static_cast<unsigned>(offlineQueue.size()));
  }

  wifiBegin();
  bool warmedUp = false;
  uint32_t resendWaitMs = OFFLINE_RESEND_INTERVAL_MS;

  CardRead card;
  for (;;) {
    // Com a fila offline vazia, dorme até chegar um cartão; com leituras pendentes, acorda para reenviar
    const TickType_t wait = offlineQueue.empty() ? pdMS_TO_TICKS(1000) : pdMS_TO_TICKS(resendWaitMs);
    if (xQueueReceive(cardQueue, &card, wait) == pdTRUE) {
      const bipcheck::Feedback feedback = handleRead(card);
      xQueueSend(resultQueue, &feedback, 0);
      continue;
    }

    if (!warmedUp && wifiIsConnected()) {
      api.warmUp();
      warmedUp = true;
    }
    if (!offlineQueue.empty() && millis() - lastPostAtMs >= OFFLINE_RESEND_INTERVAL_MS) {
      resendWaitMs = resendOldest() ? OFFLINE_RESEND_INTERVAL_MS : OFFLINE_RETRY_INTERVAL_MS;
    }
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
  resultQueue = xQueueCreate(CARD_QUEUE_LENGTH, sizeof(bipcheck::Feedback));
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

  bipcheck::Feedback feedback = bipcheck::Feedback::Error;
  if (xQueueReceive(resultQueue, &feedback, 0) == pdTRUE) {
    buzzer.play(bipcheck::beepFor(feedback));
  }

  buzzer.update();
  delay(5);  // cede o processador para outras tarefas (Wi-Fi) sem atrasar a leitura
}
