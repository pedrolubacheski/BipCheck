#include "wifi_connection.h"

#include <WiFi.h>

#include <ctime>

#include "config.h"
#include "secrets.h"

namespace {

void onWifiEvent(WiFiEvent_t event) {
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    Serial.printf("Wi-Fi conectado: %s\n", WiFi.localIP().toString().c_str());
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    Serial.println("Wi-Fi desconectado");
  }
}

}  // namespace

void wifiBegin() {
  WiFi.onEvent(onWifiEvent);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // sem economia de energia do Wi-Fi: responde mais rápido
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // UTC, sem fuso: o servidor recebe o horário em UTC. O ajuste acontece sozinho quando houver rede.
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);
}

bool wifiIsConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void wifiRetry() {
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

uint32_t clockNowEpoch() {
  return static_cast<uint32_t>(time(nullptr));
}
