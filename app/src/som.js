// Bip gerado pelo próprio navegador (sem arquivo de áudio).
// Os navegadores só liberam som depois de um toque do usuário, por isso existe ativarSom().
let ctx = null

export function ativarSom() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  bip()
}

export function somAtivo() {
  return ctx?.state === 'running'
}

export function bip() {
  if (!somAtivo()) return
  const osc = ctx.createOscillator()
  const volume = ctx.createGain()
  osc.frequency.value = 880
  volume.gain.setValueAtTime(0.2, ctx.currentTime)
  volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.connect(volume).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.25)
}
