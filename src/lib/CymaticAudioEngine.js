export class CymaticAudioEngine {
  constructor() {
    this.level = 0;
    this.playing = false;
    this.frequency = 432;
    this.amplitude = 0.5;
    this.startedAt = performance.now();
  }

  async startTone(frequency = 432, amplitude = 0.5) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.playing = true;
    this.startedAt = performance.now();
  }

  setTone(frequency = 432, amplitude = 0.5) {
    this.frequency = frequency;
    this.amplitude = amplitude;
  }

  stopTone() {
    this.playing = false;
    this.level = 0;
  }

  async startMicrophone() {
    return false;
  }

  stopMicrophone() {
    return undefined;
  }

  getLevel() {
    if (!this.playing) {
      this.level *= 0.88;
      return this.level;
    }

    const t = (performance.now() - this.startedAt) * 0.001;
    const carrier = Math.sin(t * this.frequency * 0.035) * 0.5 + 0.5;
    const pulse = Math.sin(t * 3.69) * 0.5 + 0.5;
    const target = Math.min(1, this.amplitude * (0.28 + carrier * 0.42 + pulse * 0.3));
    this.level = this.level * 0.82 + target * 0.18;
    return this.level;
  }

  dispose() {
    this.stopTone();
  }
}
