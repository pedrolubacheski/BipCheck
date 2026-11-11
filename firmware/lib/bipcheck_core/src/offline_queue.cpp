#include "offline_queue.h"

namespace bipcheck {

namespace {

constexpr uint8_t FORMAT_VERSION = 1;
constexpr size_t MAX_UID_LENGTH = 20;  // UID de até 10 bytes em hexadecimal

bool isValidUid(const std::string& uid) {
  if (uid.empty() || uid.size() > MAX_UID_LENGTH) {
    return false;
  }
  for (char c : uid) {
    const bool isHex = (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F');
    if (!isHex) {
      return false;
    }
  }
  return true;
}

}  // namespace

bool OfflineQueue::push(const std::string& uid, uint32_t readAtEpoch) {
  if (items_.size() >= capacity_ || !isValidUid(uid)) {
    return false;
  }
  items_.push_back({uid, readAtEpoch});
  return true;
}

void OfflineQueue::pop() {
  if (!items_.empty()) {
    items_.pop_front();
  }
}

std::vector<uint8_t> OfflineQueue::serialize() const {
  std::vector<uint8_t> bytes;
  bytes.push_back(FORMAT_VERSION);
  bytes.push_back(static_cast<uint8_t>(items_.size()));
  for (const PendingBoarding& item : items_) {
    bytes.push_back(static_cast<uint8_t>(item.uid.size()));
    bytes.insert(bytes.end(), item.uid.begin(), item.uid.end());
    for (int shift = 0; shift < 32; shift += 8) {
      bytes.push_back(static_cast<uint8_t>(item.readAtEpoch >> shift));
    }
  }
  return bytes;
}

bool OfflineQueue::deserialize(const uint8_t* data, size_t length) {
  items_.clear();
  if (data == nullptr || length < 2 || data[0] != FORMAT_VERSION || data[1] > capacity_) {
    return false;
  }

  std::deque<PendingBoarding> loaded;
  size_t position = 2;
  for (uint8_t i = 0; i < data[1]; i++) {
    if (position >= length) {
      return false;
    }
    const size_t uidLength = data[position++];
    if (position + uidLength + 4 > length) {
      return false;
    }
    const std::string uid(reinterpret_cast<const char*>(data + position), uidLength);
    position += uidLength;
    if (!isValidUid(uid)) {
      return false;
    }
    uint32_t epoch = 0;
    for (int shift = 0; shift < 32; shift += 8) {
      epoch |= static_cast<uint32_t>(data[position++]) << shift;
    }
    loaded.push_back({uid, epoch});
  }
  if (position != length) {
    return false;
  }

  items_ = std::move(loaded);
  return true;
}

}  // namespace bipcheck
