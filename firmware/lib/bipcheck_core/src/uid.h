// Formatação do UID do cartão RFID (lógica pura, testada no PC)
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace bipcheck {

// Bytes do UID -> texto hexadecimal maiúsculo, 2 dígitos por byte (ex.: {0x0A, 0xFF} -> "0AFF")
std::string formatUid(const uint8_t* bytes, size_t length);

}  // namespace bipcheck
