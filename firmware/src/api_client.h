// Cliente HTTPS da função register-boarding.
// Valida o certificado do servidor (raízes em root_ca.h) e mantém a conexão aberta
// entre leituras, para não refazer o TLS (lento no ESP32) a cada cartão.
#pragma once

#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include <string>

class ApiClient {
 public:
  void begin();
  // Abre a conexão antes da primeira leitura (um GET não grava nada: a função responde 405)
  void warmUp();
  // Retorna o código HTTP (200 = sucesso) ou um valor negativo em falha de rede.
  // readAtEpoch > 0: leitura guardada sem rede, enviada com o horário em que o cartão foi lido.
  int postBoarding(const std::string& uid, uint32_t readAtEpoch = 0);

 private:
  void prepareRequest();

  WiFiClientSecure client_;
  HTTPClient http_;
};
