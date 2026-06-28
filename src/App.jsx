import { useEffect, useMemo, useRef, useState } from 'react';
import VisualizerCanvas from './components/VisualizerCanvas.jsx';
import { CymaticAudioEngine } from './lib/CymaticAudioEngine.js';

const viewModes = [
  { label: 'Top mandala', value: 0 },
  { label: 'Side torus', value: 1 },
  { label: 'Center dive', value: 2 },
  { label: 'Field tunnel', value: 3 }
];

const claimModes = [
  {
    label: 'Artistic',
    value: 0,
    allowed: 'A visual interpretation inspired by cymatic geometry.',
    blocked: 'This proves a hidden 3D object exists inside one flat image.'
  },
  {
    label: 'Simulated',
    value: 1,
    allowed: 'A procedural wave-field generated from declared controls.',
    blocked: 'This is measured physical data without capture receipts.'
  },
  {
    label: 'Inferred',
    value: 2,
    allowed: 'A reconstruction hypothesis from a source pattern.',
    blocked: 'The inference is the same thing as verification.'
  },
  {
    label: 'Measured',
    value: 3,
    allowed: 'Reserved for real capture data, calibration, and uncertainty notes.',
    blocked: 'Using the measured label before the evidence exists.'
  }
];

function formatHz(value) {
  return `${Number(value).toFixed(value < 100 ? 1 : 0)} Hz`;
}

export default function App() {
  const [frequency, setFrequency] = useState(432);
  const [amplitude, setAmplitude] = useState(0.62);
  const [symmetry, setSymmetry] = useState(12);
  const [harmonics, setHarmonics] = useState(7);
  const [bloom, setBloom] = useState(0.72);
  const [spin, setSpin] = useState(0.38);
  const [viewMode, setViewMode] = useState(0);
  const [claimMode, setClaimMode] = useState(1);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioState, setAudioState] = useState('stopped');
  const [micState, setMicState] = useState('off');
  const audioRef = useRef(null);

  const currentClaim = useMemo(
    () => claimModes.find((mode) => mode.value === Number(claimMode)) ?? claimModes[0],
    [claimMode]
  );

  useEffect(() => {
    audioRef.current = new CymaticAudioEngine();
    let frameId;

    const tick = () => {
      const engine = audioRef.current;
      setAudioLevel(engine ? engine.getLevel() : 0);
      frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      audioRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setTone(frequency, amplitude);
  }, [frequency, amplitude]);

  const handleToneToggle = async () => {
    const engine = audioRef.current;
    if (!engine) return;

    if (audioState === 'playing') {
      engine.stopTone();
      setAudioState('stopped');
      return;
    }

    await engine.startTone(frequency, amplitude);
    setAudioState('playing');
    setMicState('off');
  };

  const handleMicToggle = async () => {
    const engine = audioRef.current;
    if (!engine) return;

    if (micState === 'on') {
      engine.stopMicrophone();
      setMicState('off');
      return;
    }

    const ok = await engine.startMicrophone();
    if (ok) {
      setMicState('on');
      setAudioState('stopped');
    } else {
      setMicState('blocked');
    }
  };

  const params = {
    frequency,
    amplitude,
    symmetry,
    harmonics,
    bloom,
    spin,
    viewMode,
    claimMode,
    audioLevel
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Parallax Lab • WebGL2 Cymatics Runtime</p>
          <h1>AquaCymatics369</h1>
          <p className="lede">
            Sound-reactive cymatic fields, torus flythroughs, mandala symmetry, and a built-in
            claim ledger so the wonder stays clean.
          </p>
        </div>

        <div className="signal-card">
          <span>Live signal</span>
          <strong>{formatHz(frequency)}</strong>
          <div className="meter" aria-label="Audio level meter">
            <i style={{ transform: `scaleX(${Math.max(0.04, Math.min(1, audioLevel + amplitude * 0.42))})` }} />
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="canvas-card">
          <VisualizerCanvas params={params} />
          <div className="canvas-badge">{currentClaim.label.toUpperCase()} RECEIPT</div>
        </div>

        <aside className="control-panel" aria-label="AquaCymatics controls">
          <div className="panel-header">
            <p>Field controls</p>
            <h2>Frequency → Form</h2>
          </div>

          <div className="button-row">
            <button className={audioState === 'playing' ? 'active' : ''} onClick={handleToneToggle}>
              {audioState === 'playing' ? 'Stop tone' : 'Play tone'}
            </button>
            <button className={micState === 'on' ? 'active' : ''} onClick={handleMicToggle}>
              {micState === 'on' ? 'Stop mic' : micState === 'blocked' ? 'Mic blocked' : 'Use mic'}
            </button>
          </div>

          <Control label="Frequency" value={frequency} min={32} max={963} step={1} unit="Hz" onChange={setFrequency} />
          <Control label="Amplitude" value={amplitude} min={0.05} max={1} step={0.01} onChange={setAmplitude} />
          <Control label="Symmetry sectors" value={symmetry} min={3} max={24} step={1} onChange={setSymmetry} />
          <Control label="Harmonic layers" value={harmonics} min={1} max={12} step={1} onChange={setHarmonics} />
          <Control label="Bloom density" value={bloom} min={0.05} max={1} step={0.01} onChange={setBloom} />
          <Control label="Field rotation" value={spin} min={0} max={1} step={0.01} onChange={setSpin} />

          <label className="select-control">
            <span>Camera</span>
            <select value={viewMode} onChange={(event) => setViewMode(Number(event.target.value))}>
              {viewModes.map((mode) => (
                <option value={mode.value} key={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <label className="select-control">
            <span>Claim class</span>
            <select value={claimMode} onChange={(event) => setClaimMode(Number(event.target.value))}>
              {claimModes.map((mode) => (
                <option value={mode.value} key={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <div className="ledger-card">
            <p className="ledger-title">Ledger overlay</p>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{formatHz(frequency)} procedural oscillator / mic signal</dd>
              </div>
              <div>
                <dt>Transform</dt>
                <dd>polar wavefield → harmonic lattice → torus projection → bloom pass</dd>
              </div>
              <div>
                <dt>Allowed</dt>
                <dd>{currentClaim.allowed}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{currentClaim.blocked}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Control({ label, value, min, max, step, unit = '', onChange }) {
  const display = Number(value).toFixed(step < 1 ? 2 : 0);

  return (
    <label className="range-control">
      <span>
        {label}
        <strong>
          {display} {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
