export function makeAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return new Ctx();
}
