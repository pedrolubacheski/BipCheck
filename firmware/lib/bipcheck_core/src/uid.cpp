#include "uid.h"

namespace bipcheck {

std::string formatUid(const uint8_t* bytes, size_t length) {
  static const char HEX_DIGITS[] = "0123456789ABCDEF";
  std::string uid;
  uid.reserve(length * 2);
  for (size_t i = 0; i < length; i++) {
    uid += HEX_DIGITS[bytes[i] >> 4];
    uid += HEX_DIGITS[bytes[i] & 0x0F];
  }
  return uid;
}

}  // namespace bipcheck
