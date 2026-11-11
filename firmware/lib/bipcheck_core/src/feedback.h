// Padrões de bip e como o resultado do envio vira bip (lógica pura, testada no PC)
//   1 bip curtinho = cartão lido (enviando...)
//   1 bip longo    = embarque registrado (ou toque repetido já registrado)
//   2 bips longos  = sem rede: leitura guardada no leitor, será enviada quando a rede voltar
//   3 bips curtos  = erro (cartão não cadastrado, leitor não autorizado, fila offline cheia...)
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
constexpr BeepPattern BEEP_STORED_OFFLINE{2, 400, 150};
constexpr BeepPattern BEEP_ERROR{3, 100, 80};
constexpr BeepPattern BEEP_READY{1, 100, 0};

enum class Feedback { Success, StoredOffline, Error };

// O que o envio de uma leitura significa para o leitor
enum class SendOutcome {
  Delivered,  // 200: o servidor registrou (ou já tinha registrado)
  Rejected,   // o servidor respondeu e recusou (cartão desconhecido, token inválido...): reenviar não adianta
  Retry,      // sem resposta útil (sem rede, servidor fora, limite de requisições): vale tentar de novo
};

// httpStatus < 0 = falha de rede (não houve resposta)
SendOutcome classifySend(int httpStatus);

// Bip de uma leitura feita agora. storedOffline só importa quando o envio deve ser repetido:
// diz se a leitura coube na fila offline.
Feedback feedbackForRead(SendOutcome outcome, bool storedOffline);

BeepPattern beepFor(Feedback feedback);

}  // namespace bipcheck
