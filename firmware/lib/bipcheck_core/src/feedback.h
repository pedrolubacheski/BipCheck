// Padrões de bip e como a resposta do servidor vira bip (lógica pura, testada no PC)
//   1 bip curtinho = cartão lido (enviando...)
//   1 bip longo    = embarque registrado (ou toque repetido já registrado)
//   3 bips curtos  = erro (cartão não cadastrado, sem rede, leitor não autorizado...)
#pragma once

#include <cstdint>

namespace bipcheck {

struct BeepPattern {
  uint8_t count;
  uint16_t onMs;
  uint16_t offMs;
};

constexpr BeepPattern BEEP_CARD_READ{1, 40, 0};
constexpr BeepPattern BEEP_SUCCESS{1, 250, 0};
constexpr BeepPattern BEEP_ERROR{3, 100, 80};
constexpr BeepPattern BEEP_READY{1, 100, 0};

enum class Feedback { Success, Error };

// A função responde 200 para registrado/repetido; qualquer outro código (ou falha de rede, < 0) é erro
Feedback feedbackForHttpStatus(int httpStatus);

BeepPattern beepFor(Feedback feedback);

}  // namespace bipcheck
