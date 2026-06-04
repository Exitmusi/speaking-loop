function playTone(frequency = 800, duration = 120, type = "sine") {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) return;

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + duration / 1000
  );

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

export function playListeningSound() {
  playTone(900, 120);
}

export function playRecognizedSound() {
  playTone(1000, 100);
}

export function playPassSound() {
  playTone(900, 90);
  setTimeout(() => playTone(1200, 90), 110);
  setTimeout(() => playTone(1500, 120), 220);
}

export function playFailSound() {
  playTone(300, 180, "triangle");
}