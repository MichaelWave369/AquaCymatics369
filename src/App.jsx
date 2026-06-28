import { useEffect, useMemo, useRef, useState } from 'react';
import VisualizerCanvas from './components/VisualizerCanvas.jsx';
import { CymaticAudioEngine } from './lib/CymaticAudioEngine.js';
import { analyzeCymaticImage, downloadReceipt, makeReconstructionReceipt } from './lib/imageReconstruction.js';

const viewModes = [
  { label: 'Top mandala', value: 0 },
  { label: 'Side torus', value: 1 },
  { label: 'Center dive', value: 2 },
  { label: 'Field tunnel', value: 3 }
];

const presets = [
  { label: '174', value: 174 },
  { label: '369', value: 369 },
  { label: '432', value: 432 },
  { label: '528', value: 528 },
  { label: '639', value: 639 }
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

function pct(value) {
  return `${Math.round(value * 100)}%`;
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
  const [reconstruction, setReconstruction] = useState(null);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadError, setUploadError] = useState('');
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
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadState('reading');
      setUploadError('');
      const result = await analyzeCymaticImage(file);
      setReconstruction(result);
      setClaimMode(2);
      setViewMode(0);
      setSymmetry(result.dominantSymmetry);
      setHarmonics(Math.max(3, Math.min(12, result.ringCount + 3)));
      setBloom(0.86);
      setAmplitude(Math.max(0.48, Math.min(0.92, 0.46 + result.confidence * 0.48)));
      setUploadState('ready');
    } catch (error) {
      console.error(error);
      setUploadError('Could not read that image. Try a PNG or JPG cymatic still.');
      setUploadState('error');
    }
  };

  const renderControls = {
    frequency,
    amplitude,
    symmetry,
    harmonics,
    bloom,
    spin,
    viewMode,
    claimMode
  };

  const params = {
    ...renderControls,
    audioLevel,
    reconstruction
  };

  const exportReceipt = () => {
    downloadReceipt(makeReconstructionReceipt(reconstruction, renderControls));
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Parallax Lab • WebGL2 Cymatics Runtime</p>
          <h1>AquaCymatics369</h1>
          <p className="lede">
            Sound-reactive cymatic fields, torus flythroughs, image-derived reconstruction hints,
            and a built-in claim ledger so the wonder stays clean.
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

          <div className="button-row single">
            <button className={audioState === 'playing' ? 'active' : ''} onClick={handleToneToggle}>
              {audioState === 'playing' ? 'Stop oscillator' : 'Start oscillator'}
            </button>
          </div>

          <div className="preset-row" aria-label="Frequency presets">
            {presets.map((preset) => (
              <button key={preset.value} className="chip" onClick={() => setFrequency(preset.value)}>
                {preset.label}
              </button>
            ))}
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

          <section className="reconstruction-card">
            <div className="card-title-row">
              <div>
                <p className="ledger-title">v0.2 image lane</p>
                <h3>Reconstruction hints</h3>
              </div>
              <label className="upload-button">
                Upload image
                <input type="file" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            {uploadState === 'reading' && <p className="subtle">Reading radial rings and symmetry...</p>}
            {uploadError && <p className="error-text">{uploadError}</p>}

            {reconstruction ? (
              <div className="reconstruction-grid">
                <img src={reconstruction.dataUrl} alt="Uploaded cymatic source" />
                <dl>
                  <div>
                    <dt>Source</dt>
                    <dd>{reconstruction.fileName}</dd>
                  </div>
                  <div>
                    <dt>Detected symmetry</dt>
                    <dd>{reconstruction.dominantSymmetry} sectors • {pct(reconstruction.symmetryConfidence)}</dd>
                  </div>
                  <div>
                    <dt>Rings / void</dt>
                    <dd>{reconstruction.ringCount} rings • void {pct(reconstruction.voidRadius)}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{pct(reconstruction.confidence)} inferred</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="subtle">
                Upload a cymatic still to extract a center void, ring profile, and dominant symmetry.
                The app will relabel the render as Inferred, not Measured.
              </p>
            )}

            <button className="receipt-button" onClick={exportReceipt}>
              Export receipt JSON
            </button>
          </section>

          <div className="ledger-card">
            <p className="ledger-title">Ledger overlay</p>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{reconstruction ? `${reconstruction.fileName} + ${formatHz(frequency)} oscillator` : `${formatHz(frequency)} browser oscillator signal`}</dd>
              </div>
              <div>
                <dt>Transform</dt>
                <dd>{reconstruction ? 'image decode → radial profile → symmetry scan → inferred field projection' : 'polar wavefield → harmonic lattice → torus projection → bloom pass'}</dd>
              </div>
              <div>
                <dt>Allowed</dt>
                <dd>{reconstruction ? reconstruction.allowedClaim : currentClaim.allowed}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{reconstruction ? reconstruction.blockedClaim : currentClaim.blocked}</dd>
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
