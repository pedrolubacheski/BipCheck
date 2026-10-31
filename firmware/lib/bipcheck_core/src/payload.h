// Corpo JSON enviado à função register-boarding (lógica pura, testada no PC)
#pragma once

#include <string>

namespace bipcheck {

// {"device_token":"...","uid":"..."}. Token e UID são hexadecimais, não precisam de escape.
std::string buildBoardingPayload(const std::string& deviceToken, const std::string& uid);

}  // namespace bipcheck
