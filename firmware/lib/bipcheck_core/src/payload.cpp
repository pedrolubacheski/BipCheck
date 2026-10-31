#include "payload.h"

namespace bipcheck {

std::string buildBoardingPayload(const std::string& deviceToken, const std::string& uid) {
  return "{\"device_token\":\"" + deviceToken + "\",\"uid\":\"" + uid + "\"}";
}

}  // namespace bipcheck
