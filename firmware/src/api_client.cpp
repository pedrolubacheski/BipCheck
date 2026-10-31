#include "api_client.h"

#include "config.h"
#include "payload.h"
#include "root_ca.h"
#include "secrets.h"

void ApiClient::begin() {
  client_.setCACert(ROOT_CA_BUNDLE);
}

void ApiClient::prepareRequest() {
  http_.setReuse(true);
  http_.setConnectTimeout(HTTP_TIMEOUT_MS);
  http_.setTimeout(HTTP_TIMEOUT_MS);
  http_.begin(client_, FUNCTION_URL);
  http_.addHeader("Content-Type", "application/json");
  http_.addHeader("x-region", FUNCTION_REGION);
}

void ApiClient::warmUp() {
  const uint32_t startedAt = millis();
  prepareRequest();
  const int status = http_.GET();
  http_.end();
  Serial.printf("Conexão aquecida: HTTP %d | %lu ms\n", status, static_cast<unsigned long>(millis() - startedAt));
}

int ApiClient::postBoarding(const std::string& uid) {
  const String body = bipcheck::buildBoardingPayload(DEVICE_TOKEN, uid).c_str();
  const uint32_t startedAt = millis();
  int status = -1;

  // Até 2 tentativas: se a conexão reaproveitada tiver caído, a segunda abre uma nova
  for (int attempt = 0; attempt < 2 && status < 0; attempt++) {
    if (attempt > 0) {
      client_.stop();
    }
    prepareRequest();
    status = http_.POST(body);
    if (status > 0) {
      http_.getString();  // consome a resposta para a conexão poder ser reaproveitada
    }
    http_.end();  // com setReuse(true) a conexão continua aberta
  }

  // Nunca imprimir o token
  Serial.printf("POST: HTTP %d | %lu ms\n", status, static_cast<unsigned long>(millis() - startedAt));
  return status;
}
