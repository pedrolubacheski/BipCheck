// Ignora o mesmo cartão lido de novo em poucos segundos (aluno segurando o cartão no leitor)
#pragma once

#include <cstdint>
#include <string>

namespace bipcheck {

class CardDebouncer {
 public:
  explicit CardDebouncer(uint32_t windowMs) : windowMs_(windowMs) {}

  // true = leitura nova, deve ser enviada; false = repetição dentro da janela
  bool accept(const std::string& uid, uint32_t nowMs);

 private:
  uint32_t windowMs_;
  std::string lastUid_;
  uint32_t lastAcceptedAtMs_ = 0;
};

}  // namespace bipcheck
