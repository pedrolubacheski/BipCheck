// BipCheck - firmware do leitor (ESP32 + RC522 + buzzer)
// Biblioteca necessária (Gerenciador de Bibliotecas): "MFRC522" de GithubCommunity / miguelbalboa

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// ====== CONFIGURAÇÃO (troque pelos seus valores) ======
const char* WIFI_SSID    = "SEU_WIFI";
const char* WIFI_SENHA   = "SUA_SENHA";
const char* URL_FUNCAO   = "https://SEU_PROJETO.supabase.co/functions/v1/registrar-embarque";
const char* DEVICE_TOKEN = "TOKEN_DA_VAN";   // coluna device_token da tabela vans

// ====== PINOS (conforme o esquema montado) ======
#define PIN_SCK    18
#define PIN_MISO   19
#define PIN_SDA    21   // SS do RC522
#define PIN_RST    22
#define PIN_MOSI   23
#define PIN_BUZZER 4    // AJUSTE para o pino em que o buzzer está ligado

MFRC522 leitor(PIN_SDA, PIN_RST);

// Buzzer ativo: liga/desliga. Se o seu for passivo, troque por tone().
void bip(int vezes, int duracaoMs) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(duracaoMs);
    digitalWrite(PIN_BUZZER, LOW);
    delay(80);
  }
}

void conectarWifi() {
  Serial.print("Conectando ao WiFi");
  WiFi.mode(WIFI_STA);
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

  WiFiClientSecure cliente;
  cliente.setInsecure();  // OK para protótipo; em produção, valide o certificado

  HTTPClient http;
  http.begin(cliente, URL_FUNCAO);
  http.addHeader("Content-Type", "application/json");

  String corpo = "{\"device_token\":\"" + String(DEVICE_TOKEN) + "\",\"uid\":\"" + uid + "\"}";
  int codigo = http.POST(corpo);

  Serial.printf("HTTP %d | %s\n", codigo, http.getString().c_str());
  http.end();
  return codigo == 200;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SDA);
  leitor.PCD_Init();

  conectarWifi();
  Serial.println("Pronto. Encoste um cartão no leitor.");
  bip(1, 100);
}

void loop() {
  if (!leitor.PICC_IsNewCardPresent() || !leitor.PICC_ReadCardSerial()) return;

  String uid = lerUid();
  Serial.println("Cartão lido: " + uid);

  if (enviarEmbarque(uid)) {
    bip(1, 150);   // 1 bip curto = embarque registrado
  } else {
    bip(3, 100);   // 3 bips = erro (cartão não cadastrado, sem rede etc.)
  }

  leitor.PICC_HaltA();
  leitor.PCD_StopCrypto1();
  delay(1500);     // evita leituras repetidas do mesmo cartão
}
