#include "beep_sequencer.h"

namespace bipcheck {

void BeepSequencer::start(const BeepPattern& pattern, uint32_t nowMs) {
  pattern_ = pattern;
  startedAtMs_ = nowMs;
  playing_ = pattern.count > 0 && pattern.onMs > 0;
}

bool BeepSequencer::isOn(uint32_t nowMs) {
  if (!playing_) {
    return false;
  }
  const uint32_t elapsed = nowMs - startedAtMs_;
  const uint32_t period = static_cast<uint32_t>(pattern_.onMs) + pattern_.offMs;
  const uint32_t total = period * pattern_.count - pattern_.offMs;
  if (elapsed >= total) {
    playing_ = false;
    return false;
  }
  return elapsed % period < pattern_.onMs;
}

}  // namespace bipcheck
