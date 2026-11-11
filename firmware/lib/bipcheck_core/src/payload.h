// Corpo JSON enviado à função register-boarding (lógica pura, testada no PC)
#pragma once

#include <cstdint>
#include <string>

namespace bipcheck {

// Leitura enviada na hora:          {"device_token":"...","uid":"..."}
// Leitura guardada sem rede e
// reenviada depois (readAtEpoch>0): {"device_token":"...","uid":"...","read_at":"2026-11-11T00:07:57Z"}
// Token e UID são hexadecimais, não precisam de escape.
std::string buildBoardingPayload(const std::string& deviceToken, const std::string& uid,
                                 uint32_t readAtEpoch = 0);

}  // namespace bipcheck
