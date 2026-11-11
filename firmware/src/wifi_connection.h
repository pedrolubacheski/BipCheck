// Wi-Fi e relógio do leitor. Nenhuma função aqui espera a rede: o leitor continua
// lendo cartões e decidindo localmente enquanto o Wi-Fi tenta voltar sozinho.
#pragma once

#include <cstdint>

// Liga o Wi-Fi (reconexão automática) e o ajuste do relógio por NTP
void wifiBegin();

bool wifiIsConnected();

// Pede uma nova tentativa de conexão sem esperar o resultado
void wifiRetry();

// Horário atual em segundos desde 1970 (UTC). Antes do primeiro ajuste por NTP o valor é
// pequeno (o relógio começa em 1970): use bipcheck::isClockSet() para saber se vale.
uint32_t clockNowEpoch();
