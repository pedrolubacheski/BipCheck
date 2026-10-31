// Toca um padrão de bips sem travar o programa (sem delay): a cada volta do loop,
// pergunta-se se o buzzer deve estar ligado naquele instante.
#pragma once

#include <cstdint>

#include "feedback.h"

namespace bipcheck {

class BeepSequencer {
 public:
  // Começa um padrão novo (substitui o que estiver tocando)
  void start(const BeepPattern& pattern, uint32_t nowMs);

  // Estado do buzzer no instante nowMs; encerra o padrão quando ele termina
  bool isOn(uint32_t nowMs);

  bool isPlaying() const { return playing_; }

 private:
  BeepPattern pattern_{0, 0, 0};
  uint32_t startedAtMs_ = 0;
  bool playing_ = false;
};

}  // namespace bipcheck
