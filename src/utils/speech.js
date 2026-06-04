export function speak(text, rate = 1, onEnd) {
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function startSpeechRecognition({
  onStart,
  onInterim,
  onResult,
  onError,
  onEnd,
}) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError("이 브라우저에서는 음성인식을 지원하지 않습니다. Chrome을 사용해주세요.");
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim();

      if (event.results[i].isFinal) {
        finalText += transcript;
      } else {
        interim += transcript;
      }
    }

    if (interim && onInterim) {
      onInterim(interim);
    }

    if (finalText && onResult) {
      onResult(finalText);
    }
  };

  recognition.onerror = () => {
    if (onError) {
      onError("음성인식에 실패했습니다. 다시 시도해주세요.");
    }
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  recognition.start();
}