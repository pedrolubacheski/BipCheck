#include "wifi_connection.h"

#include <WiFi.h>

#include "config.h"
#include "secrets.h"

void wifiBegin() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // sem economia de energia do Wi-Fi: responde mais rápido
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool wifiEnsureConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }
  Serial.println("Wi-Fi desconectado, conectando...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  const uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startedAt > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("Wi-Fi não conectou");
      return false;
    }
    delay(250);  // só a tarefa de rede espera aqui
  }
  Serial.printf("Wi-Fi conectado: %s\n", WiFi.localIP().toString().c_str());
  return true;
}
