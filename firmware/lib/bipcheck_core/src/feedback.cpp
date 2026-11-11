#include "feedback.h"

namespace bipcheck {

SendOutcome classifySend(int httpStatus) {
  if (httpStatus == 200) {
    return SendOutcome::Delivered;
  }
  // 429 = limite de requisições; 5xx = servidor com problema. Nos dois casos a leitura ainda é válida.
  if (httpStatus < 0 || httpStatus == 429 || httpStatus >= 500) {
    return SendOutcome::Retry;
  }
  return SendOutcome::Rejected;
}

Feedback feedbackForRead(SendOutcome outcome, bool storedOffline) {
  switch (outcome) {
    case SendOutcome::Delivered:
      return Feedback::Success;
    case SendOutcome::Retry:
      return storedOffline ? Feedback::StoredOffline : Feedback::Error;
    case SendOutcome::Rejected:
    default:
      return Feedback::Error;
  }
}

BeepPattern beepFor(Feedback feedback) {
  switch (feedback) {
    case Feedback::Success:
      return BEEP_SUCCESS;
    case Feedback::StoredOffline:
      return BEEP_STORED_OFFLINE;
    case Feedback::Error:
    default:
      return BEEP_ERROR;
  }
}

}  // namespace bipcheck
