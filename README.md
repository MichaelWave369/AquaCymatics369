# AquaCymatics369

A browser-based cymatics field explorer for sound-reactive WebGL visuals and claim-safe reconstruction experiments.

## Vision

AquaCymatics369 turns frequency, audio level, symmetry, source-image hints, spectrum analysis, sweep mode, saved sessions, and camera controls into explorable visual fields. The project keeps wonder and honesty together: renders are labeled as artistic, simulated, inferred, or measured depending on the input and pipeline.

## v0.3.1 prototype

- React + Vite GitHub Pages app
- Custom WebGL2 procedural cymatic shader engine
- Browser oscillator signal with analyser-driven visual response
- Harmonic audio blend using multiple oscillator partials
- Live spectrum monitor with peak-frequency readout
- Sweep mode with start, end, duration, and progress controls
- PNG canvas snapshot export
- Local saved sessions with load and delete controls
- Frequency presets plus amplitude, symmetry, harmonic, bloom, rotation, and camera controls
- Image upload lane that extracts center void, radial rings, dominant symmetry, and confidence
- Source-image metrics routed into the WebGL field as inferred reconstruction hints
- Receipt JSON export
- Claim ledger overlay with Artistic, Simulated, Inferred, and Measured classes

## Quick start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages

This repo includes a GitHub Actions workflow that builds the Vite app and deploys it to GitHub Pages. In the repository settings, set Pages source to GitHub Actions.

Expected project URL after Pages is enabled:

```text
https://michaelwave369.github.io/AquaCymatics369/
```

## Claim boundary

A 2D cymatic image can inspire a 3D reconstruction, but it does not prove a hidden 3D object by itself. This app is designed to make that boundary visible in the interface.

See `docs/CLAIM_BOUNDARY.md` and `docs/ROADMAP.md` for the receipt lane and next build steps.
