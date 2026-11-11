// Horário da leitura em texto, para o campo read_at do payload (lógica pura, testada no PC)
#pragma once

#include <cstdint>
#include <string>

namespace bipcheck {

// O relógio do ESP32 começa em 1970 e só vale depois do ajuste por NTP.
// Qualquer valor antes desta data significa "relógio ainda não ajustado".
constexpr uint32_t MIN_VALID_EPOCH = 1767225600;  // 2026-01-01T00:00:00Z

inline bool isClockSet(uint32_t epoch) { return epoch >= MIN_VALID_EPOCH; }

// Segundos desde 1970 (UTC) -> "2026-11-11T00:07:57Z" (ISO 8601)
std::string formatIsoUtc(uint32_t epoch);

}  // namespace bipcheck
