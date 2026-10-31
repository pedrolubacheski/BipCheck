// Buzzer ativo sem travar o loop: play() agenda o padrão, update() liga/desliga o pino
#pragma once

#include <cstdint>

#include "beep_sequencer.h"
#include "feedback.h"

class Buzzer {
 public:
  explicit Buzzer(uint8_t pin) : pin_(pin) {}

  void begin();
  void play(const bipcheck::BeepPattern& pattern);
  // Chamar a cada volta do loop
  void update();

 private:
  uint8_t pin_;
  bipcheck::BeepSequencer sequencer_;
};
