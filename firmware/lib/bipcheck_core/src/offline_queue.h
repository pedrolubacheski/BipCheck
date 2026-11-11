// Fila de embarques lidos sem rede (lógica pura, testada no PC).
// Regra local do leitor: se o envio falhar por falta de rede, a leitura fica guardada aqui
// e é reenviada quando a conexão voltar. O conteúdo é gravado na flash (NVS) pelo firmware,
// então a fila sobrevive a um reinício do ESP32.
#pragma once

#include <cstddef>
#include <cstdint>
#include <deque>
#include <string>
#include <vector>

namespace bipcheck {

struct PendingBoarding {
  std::string uid;
  uint32_t readAtEpoch;  // segundos desde 1970 (UTC); 0 = o relógio ainda não estava ajustado
};

class OfflineQueue {
 public:
  explicit OfflineQueue(size_t capacity) : capacity_(capacity) {}

  // Guarda uma leitura no fim da fila. false = fila cheia ou UID inválido (nada é guardado).
  // Fila cheia recusa a leitura nova em vez de apagar a mais antiga: o leitor avisa com bip de erro.
  bool push(const std::string& uid, uint32_t readAtEpoch);

  bool empty() const { return items_.empty(); }
  size_t size() const { return items_.size(); }
  size_t capacity() const { return capacity_; }

  // Leitura mais antiga (só chamar com a fila não vazia)
  const PendingBoarding& front() const { return items_.front(); }
  void pop();

  // Formato gravado na flash: [versão][quantidade] e, por item, [tamanho do UID][UID][epoch em 4 bytes]
  std::vector<uint8_t> serialize() const;
  // Carrega o que foi gravado. Dado corrompido ou de outra versão: a fila fica vazia e retorna false.
  bool deserialize(const uint8_t* data, size_t length);

 private:
  size_t capacity_;
  std::deque<PendingBoarding> items_;
};

}  // namespace bipcheck
