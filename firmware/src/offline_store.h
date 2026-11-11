// Grava e carrega a fila offline na flash do ESP32 (NVS), para ela sobreviver a um reinício
#pragma once

#include "offline_queue.h"

class OfflineStore {
 public:
  // Carrega o que estiver gravado. Sem nada gravado (ou dado corrompido), a fila fica vazia.
  void load(bipcheck::OfflineQueue& queue);
  // Grava a fila inteira. Chamar sempre que ela mudar.
  void save(const bipcheck::OfflineQueue& queue);
};
