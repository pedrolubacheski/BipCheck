#include "payload.h"

#include "timestamp.h"

namespace bipcheck {

std::string buildBoardingPayload(const std::string& deviceToken, const std::string& uid,
                                 uint32_t readAtEpoch) {
  std::string payload = "{\"device_token\":\"" + deviceToken + "\",\"uid\":\"" + uid + "\"";
  if (isClockSet(readAtEpoch)) {
    payload += ",\"read_at\":\"" + formatIsoUtc(readAtEpoch) + "\"";
  }
  return payload + "}";
}

}  // namespace bipcheck
