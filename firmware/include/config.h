// Configuração fixa do hardware e dos tempos do leitor (nada secreto aqui)
#pragma once

#include <cstdint>

// Pinos do RC522 (SPI) e do buzzer, conforme a montagem atual
constexpr uint8_t PIN_SCK = 18;
constexpr uint8_t PIN_MISO = 19;
constexpr uint8_t PIN_SS = 21;  // SDA do RC522
constexpr uint8_t PIN_RST = 22;
constexpr uint8_t PIN_MOSI = 23;
constexpr uint8_t PIN_BUZZER = 26;  // buzzer ativo

constexpr uint32_t SERIAL_BAUD = 115200;

// Mesmo cartão lido de novo dentro desta janela é ignorado no próprio leitor
constexpr uint32_t SAME_CARD_DEBOUNCE_MS = 3000;

// Rede
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr uint32_t HTTP_TIMEOUT_MS = 5000;
// A função roda na mesma região do banco: a ida ao banco fica local
constexpr const char* FUNCTION_REGION = "us-east-1";

// Fila de cartões lidos aguardando envio
constexpr uint8_t CARD_QUEUE_LENGTH = 8;
