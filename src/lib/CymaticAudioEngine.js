export class CymaticAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.analyser = null;
    this.data = null;
    this.partials = [];
    this.level = 0;
    this.frequency = 432;
    this.amplitude = 0.5;
    this.harmonicMix = 0.18;
    this.peakHz = 0;
  }

  async boot() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.84;
      this.data = new Uint8Array(this.analyser.frequencyBinCount);
      this.master.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.master.gain.value = 0.72;
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async startTone(frequency = 432, amplitude = 0.5, harmonicMix = 0.18) {
    await this.boot();
    this.stopTone();
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.harmonicMix = harmonicMix;

    const ratios = [1, 2, 3, 4];
    const now = this.ctx.currentTime;

    this.partials = ratios.map((ratio, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const harmonicLevel = index === 0 ? 1 : harmonicMix / (index + 1);
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(frequency * ratio, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(this.safeGain(amplitude, harmonicLevel), now + 0.08);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      return { osc, gain, ratio, harmonicLevel };
    });
  }

  setTone(frequency = 432, amplitude = 0.5, harmonicMix = this.harmonicMix) {
    this.frequency = frequency;
    this.amplitude = amplitude;
    this.harmonicMix = harmonicMix;

    if (!this.ctx || this.partials.length === 0) return;

    const now = this.ctx.currentTime;
    this.partials.forEach((partial, index) => {
      const harmonicLevel = index === 0 ? 1 : harmonicMix / (index + 1);
      partial.harmonicLevel = harmonicLevel;
      partial.osc.frequency.setTargetAtTime(frequency * partial.ratio, now, 0.025);
      partial.gain.gain.setTargetAtTime(this.safeGain(amplitude, harmonicLevel), now, 0.04);
    });
  }

  stopTone() {
    if (!this.ctx || this.partials.length === 0) return;

    const now = this.ctx.currentTime;
    this.partials.forEach((partial) => {
      try {
        partial.gain.gain.setTargetAtTime(0.0001, now, 0.02);
        partial.osc.stop(now + 0.07);
      } catch {
        // Already stopped.
      }
      partial.osc.disconnect();
      partial.gain.disconnect();
    });

    this.partials = [];
  }

  getLevel() {
    if (!this.analyser || !this.data) return 0;

    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    let bestValue = 0;
    let bestIndex = 0;

    for (let i = 0; i < this.data.length; i += 1) {
      const normalized = this.data[i] / 255;
      sum += normalized * normalized;
      if (this.data[i] > bestValue) {
        bestValue = this.data[i];
        bestIndex = i;
      }
    }

    const rms = Math.sqrt(sum / this.data.length);
    this.level = this.level * 0.82 + rms * 0.18;
    this.peakHz = this.ctx ? (bestIndex * this.ctx.sampleRate) / this.analyser.fftSize : 0;
    return Math.min(1, this.level * 2.8);
  }

  getSpectrum(binCount = 48) {
    if (!this.analyser || !this.data) return Array.from({ length: binCount }, () => 0);

    this.analyser.getByteFrequencyData(this.data);
    const bins = [];
    const stride = Math.max(1, Math.floor(this.data.length / binCount));

    for (let bin = 0; bin < binCount; bin += 1) {
      let total = 0;
      const start = bin * stride;
      const end = Math.min(this.data.length, start + stride);
      for (let i = start; i < end; i += 1) {
        total += this.data[i] / 255;
      }
      bins.push(end > start ? total / (end - start) : 0);
    }

    return bins;
  }

  getPeakFrequency() {
    return this.peakHz;
  }

  safeGain(amplitude, harmonicLevel) {
    return Math.max(0.0001, Math.min(0.18, amplitude * 0.11 * harmonicLevel));
  }

  dispose() {
    this.stopTone();
    this.ctx?.close();
    this.ctx = null;
  }
}
