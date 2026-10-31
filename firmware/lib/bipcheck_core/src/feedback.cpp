#include "feedback.h"

namespace bipcheck {

Feedback feedbackForHttpStatus(int httpStatus) {
  return httpStatus == 200 ? Feedback::Success : Feedback::Error;
}

BeepPattern beepFor(Feedback feedback) {
  return feedback == Feedback::Success ? BEEP_SUCCESS : BEEP_ERROR;
}

}  // namespace bipcheck
