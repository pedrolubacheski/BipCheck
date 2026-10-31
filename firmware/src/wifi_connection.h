// Conexão Wi-Fi (usada só pela tarefa de rede; pode bloquear sem travar a leitura de cartões)
#pragma once

void wifiBegin();
// Garante a conexão; tenta por até WIFI_CONNECT_TIMEOUT_MS. true se conectado.
bool wifiEnsureConnected();
