// Bip gerado pelo navegador quando chega um embarque (sem arquivo de áudio)
let audioContext: AudioContext | null = null;

export function playBeep(): void {
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch {
    // Navegador sem áudio ou bloqueado: o embarque continua aparecendo na tela
  }
}
