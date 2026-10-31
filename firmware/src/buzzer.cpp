#include "buzzer.h"

#include <Arduino.h>

void Buzzer::begin() {
  pinMode(pin_, OUTPUT);
  digitalWrite(pin_, LOW);
}

void Buzzer::play(const bipcheck::BeepPattern& pattern) {
  sequencer_.start(pattern, millis());
  update();
}

void Buzzer::update() {
  digitalWrite(pin_, sequencer_.isOn(millis()) ? HIGH : LOW);
}
