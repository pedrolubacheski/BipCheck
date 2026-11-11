#include "timestamp.h"

#include <cstdio>

namespace bipcheck {

std::string formatIsoUtc(uint32_t epoch) {
  const uint32_t secondsOfDay = epoch % 86400;
  // Dias desde 1970 -> ano/mês/dia (algoritmo "civil from days", de Howard Hinnant).
  // Feito à mão para o mesmo código rodar no ESP32 e nos testes do PC.
  const uint32_t z = epoch / 86400 + 719468;
  const uint32_t era = z / 146097;
  const uint32_t dayOfEra = z - era * 146097;
  const uint32_t yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
  const uint32_t dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
  const uint32_t monthIndex = (5 * dayOfYear + 2) / 153;  // 0 = março
  const uint32_t day = dayOfYear - (153 * monthIndex + 2) / 5 + 1;
  const uint32_t month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
  const uint32_t year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);

  char text[32];
  snprintf(text, sizeof(text), "%04u-%02u-%02uT%02u:%02u:%02uZ", static_cast<unsigned>(year),
           static_cast<unsigned>(month), static_cast<unsigned>(day),
           static_cast<unsigned>(secondsOfDay / 3600), static_cast<unsigned>(secondsOfDay % 3600 / 60),
           static_cast<unsigned>(secondsOfDay % 60));
  return text;
}

}  // namespace bipcheck
