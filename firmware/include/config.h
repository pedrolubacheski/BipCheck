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
constexpr uint32_t HTTP_TIMEOUT_MS = 5000;
// A função roda na mesma região do banco: a ida ao banco fica local
constexpr const char* FUNCTION_REGION = "us-east-1";

// Fila de cartões lidos aguardando envio
constexpr uint8_t CARD_QUEUE_LENGTH = 8;

// Fila offline: leituras feitas sem rede, guardadas na flash e reenviadas quando a rede voltar
constexpr uint8_t OFFLINE_QUEUE_CAPACITY = 50;
// O servidor aceita 1 requisição por segundo por leitor: o reenvio respeita esse intervalo com folga
constexpr uint32_t OFFLINE_RESEND_INTERVAL_MS = 1200;
// Depois de uma tentativa de reenvio que falhou, espera antes de tentar de novo
constexpr uint32_t OFFLINE_RETRY_INTERVAL_MS = 10000;

// Relógio (NTP): o horário da leitura acompanha os embarques reenviados
constexpr const char* NTP_SERVER_1 = "pool.ntp.org";
constexpr const char* NTP_SERVER_2 = "time.google.com";
