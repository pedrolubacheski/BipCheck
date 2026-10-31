#include "card_reader.h"

#include <SPI.h>

#include "config.h"
#include "uid.h"

void CardReader::begin() {
  SPI.begin(PIN_SCK, PIN_MISO, PIN_MOSI, PIN_SS);
  mfrc522_.PCD_Init(PIN_SS, PIN_RST);
}

bool CardReader::poll(std::string& uid) {
  if (!mfrc522_.PICC_IsNewCardPresent() || !mfrc522_.PICC_ReadCardSerial()) {
    return false;
  }
  uid = bipcheck::formatUid(mfrc522_.uid.uidByte, mfrc522_.uid.size);
  mfrc522_.PICC_HaltA();
  mfrc522_.PCD_StopCrypto1();
  return true;
}
