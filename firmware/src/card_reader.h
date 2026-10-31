// Leitor RFID RC522 (SPI)
#pragma once

#include <MFRC522.h>

#include <string>

class CardReader {
 public:
  void begin();
  // true se um cartão novo foi lido; o UID vem em hexadecimal maiúsculo
  bool poll(std::string& uid);

 private:
  MFRC522 mfrc522_{};
};
