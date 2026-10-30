// BipCheck - firmware do leitor (ESP32 + RC522 + buzzer)
// Biblioteca necessária (Gerenciador de Bibliotecas): "MFRC522" de GithubCommunity / miguelbalboa
//
// Antes de compilar: copie segredos.example.h para segredos.h e preencha.
//
// Sons:
//   1 bip curtinho  = cartão lido (enviando...)
//   1 bip longo     = embarque registrado
//   3 bips curtos   = erro (cartão não cadastrado, sem rede etc.)

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <esp_system.h>
#include "segredos.h"   // WIFI_SSID, WIFI_SENHA, URL_FUNCAO, DEVICE_TOKEN

// ====== PINOS (conforme o esquema montado) ======
#define PIN_SCK    18
#define PIN_MISO   19
#define PIN_SDA    21   // SS do RC522
#define PIN_RST    22
#define PIN_MOSI   23
#define PIN_BUZZER 26   // pino em que o buzzer está ligado

MFRC522 leitor(PIN_SDA, PIN_RST);

// Objetos globais: a conexão HTTPS fica aberta entre uma leitura e outra,
// evitando refazer o TLS (que é lento no ESP32) a cada cartão.
WiFiClientSecure cliente;
HTTPClient http;

// Buzzer ativo: liga/desliga. Se o seu for passivo, troque por tone().
void bip(int vezes, int duracaoMs) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(duracaoMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < vezes - 1) delay(80);
  }
}

// Motivo do último reinício, para diagnosticar reinícios sozinhos
const char* motivoReset() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON:  return "power-on (ligou na energia)";
    case ESP_RST_EXT:      return "pino de reset externo";
    case ESP_RST_SW:       return "software (ESP.restart)";
    case ESP_RST_PANIC:    return "panic (erro no programa)";
    case ESP_RST_INT_WDT:  return "watchdog de interrupção";
    case ESP_RST_TASK_WDT: return "watchdog de tarefa";
    case ESP_RST_WDT:      return "watchdog";
    case ESP_RST_BROWNOUT: return "brownout (queda de tensão)";
    case ESP_RST_DEEPSLEEP:return "saiu do deep sleep";
    default:               return "desconhecido";
  }
}

void conectarWifi() {
  Serial.print("Conectando ao WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // sem economia de energia do WiFi: responde mais rápido
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - inicio > 20000) {  // não fica preso para sempre se a rede sumir
      Serial.println("\nWiFi não conectou, tentando de novo");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_SENHA);
      inicio = millis();
    }
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado: " + WiFi.localIP().toString());
}

String lerUid() {
  String uid = "";
  for (byte i = 0; i < leitor.uid.size; i++) {
    if (leitor.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(leitor.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void prepararRequisicao() {
  http.setReuse(true);
  http.setConnectTimeout(5000);
  http.setTimeout(5000);
  http.begin(cliente, URL_FUNCAO);
  http.addHeader("Content-Type", "application/json");
  // Roda a função na mesma região do banco (us-east-1): a ida ao banco fica local
  http.addHeader("x-region", "us-east-1");
}

// Abre a conexão HTTPS já no setup, para a 1ª leitura não pagar o TLS.
// Um GET não grava nada: a função responde 405.
void aquecerConexao() {
  unsigned long inicio = millis();
  prepararRequisicao();
  int codigo = http.GET();
  http.end();
  Serial.printf("Conexão aquecida: HTTP %d | %lu ms\n", codigo, millis() - inicio);
}

// Retorna true se o servidor confirmou o embarque (HTTP 200)
bool enviarEmbarque(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) conectarWifi();

  String corpo = "{\"device_token\":\"" DEVICE_TOKEN "\",\"uid\":\"" + uid + "\"}";
  unsigned long inicio = millis();
  int codigo = -1;
  String resposta = "";

  // Até 2 tentativas: se a conexão reaproveitada tiver caído, a 2ª abre uma nova.
  for (int tentativa = 0; tentativa < 2 && codigo < 0; tentativa++) {
    if (tentativa > 0) cliente.stop();
    prepararRequisicao();
    codigo = http.POST(corpo);
    if (codigo > 0) resposta = http.getString();
    http.end();  // com setReuse(true) a conexão continua aberta
  }

  Serial.printf("POST: HTTP %d | %s | %lu ms\n", codigo, resposta.c_str(), millis() - inicio);
  return codigo == 200;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.printf("\nMotivo do último reinício: %s\n", motivoReset());

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SDA);
  leitor.PCD_Init();

  cliente.setInsecure();  // OK para protótipo; em produção, valide o certificado
  conectarWifi();
  aquecerConexao();

  Serial.println("Pronto. Encoste um cartão no leitor.");
  bip(1, 100);
}

void loop() {
  unsigned long inicioLeitura = millis();
  if (!leitor.PICC_IsNewCardPresent() || !leitor.PICC_ReadCardSerial()) return;

  String uid = lerUid();
  Serial.printf("Cartão lido: %s | leitura %lu ms\n", uid.c_str(), millis() - inicioLeitura);
  bip(1, 40);  // feedback imediato: o cartão foi lido

  unsigned long inicioTotal = millis();
  if (enviarEmbarque(uid)) {
    bip(1, 250);   // bip longo = embarque registrado
  } else {
    bip(3, 100);   // 3 bips curtos = erro
  }
  Serial.printf("Do bip curto ao resultado: %lu ms\n", millis() - inicioTotal);

  leitor.PICC_HaltA();
  leitor.PCD_StopCrypto1();
  delay(1000);     // evita leituras repetidas do mesmo cartão
}
