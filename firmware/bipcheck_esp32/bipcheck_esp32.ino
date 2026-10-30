// BipCheck - firmware do leitor (ESP32 + RC522 + buzzer)
// Biblioteca necessária (Gerenciador de Bibliotecas): "MFRC522" de GithubCommunity / miguelbalboa
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

// ====== CONFIGURAÇÃO (troque pelos seus valores) ======
const char* WIFI_SSID    = "supabase-teste";
const char* WIFI_SENHA   = "testeteste";
const char* URL_FUNCAO   = "https://xjqaxqorgzcvocgfbqrh.supabase.co/functions/v1/registrar-embarque";
const char* DEVICE_TOKEN = "c0de6d1a3f384126a1c5e9e38e5ec549";   // coluna device_token da tabela vans

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

void conectarWifi() {
  Serial.print("Conectando ao WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // sem economia de energia do WiFi: responde mais rápido
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  while (WiFi.status() != WL_CONNECTED) {
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

// Retorna true se o servidor confirmou o embarque (HTTP 200)
bool enviarEmbarque(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) conectarWifi();

  String corpo = "{\"device_token\":\"" + String(DEVICE_TOKEN) + "\",\"uid\":\"" + uid + "\"}";
  unsigned long inicio = millis();
  int codigo = -1;
  String resposta = "";

  // Até 2 tentativas: se a conexão reaproveitada tiver caído, a 2ª abre uma nova.
  for (int tentativa = 0; tentativa < 2 && codigo < 0; tentativa++) {
    if (tentativa > 0) cliente.stop();
    http.setReuse(true);
    http.setTimeout(8000);
    http.begin(cliente, URL_FUNCAO);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-region", "sa-east-1");
    codigo = http.POST(corpo);
    if (codigo > 0) resposta = http.getString();
    http.end();  // com setReuse(true) a conexão continua aberta
  }

  Serial.printf("HTTP %d | %s | %lu ms\n", codigo, resposta.c_str(), millis() - inicio);
  return codigo == 200;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SDA);
  leitor.PCD_Init();

  cliente.setInsecure();  // OK para protótipo; em produção, valide o certificado
  conectarWifi();

  Serial.println("Pronto. Encoste um cartão no leitor.");
  bip(1, 100);
}

void loop() {
  if (!leitor.PICC_IsNewCardPresent() || !leitor.PICC_ReadCardSerial()) return;

  String uid = lerUid();
  Serial.println("Cartão lido: " + uid);
  bip(1, 40);  // feedback imediato: o cartão foi lido

  if (enviarEmbarque(uid)) {
    bip(1, 250);   // bip longo = embarque registrado
  } else {
    bip(3, 100);   // 3 bips curtos = erro
  }

  leitor.PICC_HaltA();
  leitor.PCD_StopCrypto1();
  delay(1000);     // evita leituras repetidas do mesmo cartão
}
