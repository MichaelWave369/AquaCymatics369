export class CymaticAudioEngine {
  constructor() {
    this.ctx = null;
    this.osc = null;
    this.gain = null;
    this.analyser = null;
    this.data = null;
    this.level = 0;
    this.frequency = 432;
    this.amplitude = 0.5;
  }

  async boot() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.86;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  async startTone(frequency = 432, amplitude = 0.5) {
    await this.boot();
    this.stopTone();
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.osc = this.ctx.createOscillator();
    this.gain = this.ctx.createGain();
    this.osc.type = 'sine';
    this.osc.frequency.value = frequency;
    this.gain.gain.value = Math.max(0.0001, amplitude * 0.12);
    this.osc.connect(this.gain);
    this.gain.connect(this.analyser);
    this.osc.start();
  }

  setTone(frequency = 432, amplitude = 0.5) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    if (!this.ctx || !this.osc || !this.gain) return;
    const now = this.ctx.currentTime;
    this.osc.frequency.setTargetAtTime(frequency, now, 0.025);
    this.gain.gain.setTargetAtTime(Math.max(0.0001, amplitude * 0.12), now, 0.03);
  }

  stopTone() {
    if (!this.osc) return;
    try {
      this.osc.stop();
    } catch {}
    this.osc.disconnect();
    this.gain?.disconnect();
    this.osc = null;
    this.gain = null;
  }

  async startMicrophone() {
    return false;
  }

  stopMicrophone() {
    return undefined;
  }

  getLevel() {
    if (!this.analyser || !this.data) return 0;
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i += 1) {
      const v = this.data[i] / 255;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.data.length);
    this.level = this.level * 0.84 + rms * 0.16;
    return Math.min(1, this.level * 2.9);
  }

  dispose() {
    this.stopTone();
    this.ctx?.close();
    this.ctx = null;
  }
}
