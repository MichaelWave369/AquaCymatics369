export function hasBrowserAudio() {
  return Boolean(window.AudioContext || window.webkitAudioContext);
}
