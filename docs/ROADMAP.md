# AquaCymatics369 Roadmap

## v0.1 — Live visual prototype

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

- Harmonic spectrum panel
- Optional live input mode
- Beat and peak detection
- Frequency presets and sweep recorder
- Session receipt export
- Add volume envelope and harmonic oscillator blend

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
