# AquaCymatics369 Roadmap

## v0.1 — Live visual prototype

Status: shipped.

- React + Vite app shell
- WebGL2 procedural cymatic field engine
- Browser oscillator signal controls
- Frequency, amplitude, symmetry, harmonics, bloom, rotation, and camera modes
- Built-in claim ledger overlay
- GitHub Pages deployment workflow

## v0.2 — Source image reconstruction lane

Status: initial pass shipped.

- Upload cymatic still image
- Extract center void, radial rings, dominant symmetry, color signal, contrast, and confidence
- Route extracted metrics into the WebGL2 field as inferred reconstruction hints
- Auto-adjust symmetry, harmonic layers, bloom, amplitude, and claim class from image analysis
- Export visual receipt JSON
- Clear label: Inferred unless validated by measured data

## v0.3 — Audio analysis lane

Status: initial pass shipped.

- Harmonic spectrum panel
- Peak-frequency readout
- Frequency presets
- Sweep mode with start, end, duration, and progress controls
- Harmonic oscillator blend using multiple partials
- Session receipt export through the existing JSON receipt lane

## v0.3.1 — Capture and session lane

Status: initial pass shipped.

- PNG canvas snapshot export
- Local saved sessions
- Load and delete controls for saved field states
- Saved session metadata for controls, spectrum, peak frequency, sweep state, and reconstruction hints
- Local-first storage in the browser

## v0.4 — Measured-data lane

- Video-frame ingestion
- Multi-frame stability scoring
- Calibration metadata
- Uncertainty notes
- Measured-mode gate that cannot be enabled without receipts

## v0.5 — 3D object export

- GLB export
- Camera path export
- Flythrough recorder
- Side/top/center-dive comparative panels
