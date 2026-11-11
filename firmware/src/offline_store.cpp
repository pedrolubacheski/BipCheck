#include "offline_store.h"

#include <Arduino.h>
#include <Preferences.h>

#include <vector>

namespace {

constexpr const char* NVS_NAMESPACE = "bipcheck";
constexpr const char* NVS_KEY = "offline_queue";

}  // namespace

void OfflineStore::load(bipcheck::OfflineQueue& queue) {
  Preferences preferences;
  if (!preferences.begin(NVS_NAMESPACE, true)) {
    return;  // namespace ainda não existe: primeira vez que o leitor liga
  }
  const size_t length = preferences.getBytesLength(NVS_KEY);
  if (length > 0) {
    std::vector<uint8_t> bytes(length);
    preferences.getBytes(NVS_KEY, bytes.data(), length);
    if (!queue.deserialize(bytes.data(), length)) {
      Serial.println("Fila offline gravada estava corrompida e foi descartada");
    }
  }
  preferences.end();
}

void OfflineStore::save(const bipcheck::OfflineQueue& queue) {
  Preferences preferences;
  if (!preferences.begin(NVS_NAMESPACE, false)) {
    Serial.println("Não foi possível abrir a flash para gravar a fila offline");
    return;
  }
  const std::vector<uint8_t> bytes = queue.serialize();
  preferences.putBytes(NVS_KEY, bytes.data(), bytes.size());
  preferences.end();
}
