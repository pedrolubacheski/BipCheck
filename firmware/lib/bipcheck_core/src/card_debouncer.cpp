#include "card_debouncer.h"

namespace bipcheck {

bool CardDebouncer::accept(const std::string& uid, uint32_t nowMs) {
  // Subtração sem sinal: continua correta quando o millis() dá a volta (~49 dias)
  if (uid == lastUid_ && nowMs - lastAcceptedAtMs_ < windowMs_) {
    return false;
  }
  lastUid_ = uid;
  lastAcceptedAtMs_ = nowMs;
  return true;
}

}  // namespace bipcheck
