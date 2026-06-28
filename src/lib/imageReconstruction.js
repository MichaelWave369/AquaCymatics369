const ANALYSIS_SIZE = 256;
const RING_BINS = 96;
const ANGLE_SAMPLES = 240;

export async function analyzeCymaticImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = ANALYSIS_SIZE;
  canvas.height = ANALYSIS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
  const imageData = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
  const pixels = imageData.data;

  const center = findDarkCenter(pixels);
  const profile = buildRadialProfile(pixels, center);
  const ringPeaks = findRingPeaks(profile).slice(0, 8);
  const mainRing = ringPeaks[0]?.radius ?? 0.55;
  const angular = buildAngularProfile(pixels, center, mainRing);
  const symmetry = estimateSymmetry(angular);
  const palette = samplePalette(pixels);
  const voidRadius = estimateVoidRadius(profile);
  const contrast = estimateContrast(profile);
  const confidence = clamp01(symmetry.confidence * 0.55 + contrast * 0.45);

  return {
    fileName: file.name,
    fileSize: file.size,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dataUrl,
    center,
    voidRadius,
    ringCount: ringPeaks.length,
    ringPeaks,
    dominantSymmetry: symmetry.sectors,
    symmetryConfidence: symmetry.confidence,
    palette,
    contrast,
    confidence,
    claimClass: 'Inferred',
    allowedClaim: 'This is an image-derived reconstruction hint, not measured 3D proof.',
    blockedClaim: 'A single flat image proves a hidden physical torus or universal code.'
  };
}

export function makeReconstructionReceipt(reconstruction, params) {
  return {
    app: 'AquaCymatics369',
    version: '0.2-image-reconstruction-lane',
    generatedAt: new Date().toISOString(),
    claimClass: reconstruction?.claimClass ?? 'Simulated',
    source: reconstruction
      ? {
          fileName: reconstruction.fileName,
          width: reconstruction.width,
          height: reconstruction.height,
          fileSize: reconstruction.fileSize
        }
      : 'procedural oscillator only',
    transform: [
      'browser image decode',
      'center/void estimate',
      'radial ring profile',
      'angular symmetry scan',
      'procedural WebGL2 field projection'
    ],
    extractedMetrics: reconstruction
      ? {
          dominantSymmetry: reconstruction.dominantSymmetry,
          symmetryConfidence: round(reconstruction.symmetryConfidence),
          voidRadius: round(reconstruction.voidRadius),
          ringCount: reconstruction.ringCount,
          ringPeaks: reconstruction.ringPeaks.map((peak) => ({
            radius: round(peak.radius),
            strength: round(peak.strength)
          })),
          contrast: round(reconstruction.contrast),
          confidence: round(reconstruction.confidence)
        }
      : null,
    renderControls: params,
    allowedClaim: reconstruction?.allowedClaim ?? 'This is a procedural visual simulation.',
    blockedClaim: reconstruction?.blockedClaim ?? 'This is measured physical data without capture receipts.'
  };
}

export function downloadReceipt(receipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `aquacymatics369-receipt-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function findDarkCenter(pixels) {
  let best = { x: 0.5, y: 0.5, score: Number.POSITIVE_INFINITY };
  const min = Math.floor(ANALYSIS_SIZE * 0.18);
  const max = Math.floor(ANALYSIS_SIZE * 0.82);

  for (let y = min; y < max; y += 2) {
    for (let x = min; x < max; x += 2) {
      const luma = getLuma(pixels, x, y);
      const dx = x / ANALYSIS_SIZE - 0.5;
      const dy = y / ANALYSIS_SIZE - 0.5;
      const centerPenalty = Math.sqrt(dx * dx + dy * dy) * 58;
      const score = luma + centerPenalty;
      if (score < best.score) {
        best = { x: x / ANALYSIS_SIZE, y: y / ANALYSIS_SIZE, score };
      }
    }
  }

  return { x: round(best.x), y: round(best.y) };
}

function buildRadialProfile(pixels, center) {
  const profile = Array.from({ length: RING_BINS }, () => 0);
  const counts = Array.from({ length: RING_BINS }, () => 0);
  const cx = center.x * ANALYSIS_SIZE;
  const cy = center.y * ANALYSIS_SIZE;
  const maxRadius = ANALYSIS_SIZE * 0.5;

  for (let r = 0; r < RING_BINS; r += 1) {
    const radius = ((r + 0.5) / RING_BINS) * maxRadius;
    for (let a = 0; a < ANGLE_SAMPLES; a += 1) {
      const theta = (a / ANGLE_SAMPLES) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(theta) * radius);
      const y = Math.round(cy + Math.sin(theta) * radius);
      if (x >= 0 && x < ANALYSIS_SIZE && y >= 0 && y < ANALYSIS_SIZE) {
        profile[r] += signalAt(pixels, x, y);
        counts[r] += 1;
      }
    }
  }

  return profile.map((value, index) => (counts[index] ? value / counts[index] : 0));
}

function buildAngularProfile(pixels, center, normalizedRadius) {
  const values = [];
  const cx = center.x * ANALYSIS_SIZE;
  const cy = center.y * ANALYSIS_SIZE;
  const radius = normalizedRadius * ANALYSIS_SIZE * 0.5;

  for (let a = 0; a < ANGLE_SAMPLES; a += 1) {
    const theta = (a / ANGLE_SAMPLES) * Math.PI * 2;
    let sum = 0;
    for (let lane = -2; lane <= 2; lane += 1) {
      const rr = radius + lane * 2.5;
      const x = Math.round(cx + Math.cos(theta) * rr);
      const y = Math.round(cy + Math.sin(theta) * rr);
      if (x >= 0 && x < ANALYSIS_SIZE && y >= 0 && y < ANALYSIS_SIZE) {
        sum += signalAt(pixels, x, y);
      }
    }
    values.push(sum / 5);
  }

  return values;
}

function estimateSymmetry(values) {
  let best = { sectors: 12, confidence: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);

  for (let k = 3; k <= 24; k += 1) {
    let cosine = 0;
    let sine = 0;
    for (let i = 0; i < centered.length; i += 1) {
      const theta = (i / centered.length) * Math.PI * 2 * k;
      cosine += centered[i] * Math.cos(theta);
      sine += centered[i] * Math.sin(theta);
    }
    const magnitude = Math.sqrt(cosine * cosine + sine * sine) / centered.length;
    if (magnitude > best.confidence) {
      best = { sectors: k, confidence: magnitude };
    }
  }

  return {
    sectors: best.sectors,
    confidence: clamp01(best.confidence * 5)
  };
}

function findRingPeaks(profile) {
  const peaks = [];
  const max = Math.max(...profile, 0.0001);

  for (let i = 2; i < profile.length - 2; i += 1) {
    const value = profile[i];
    if (value > profile[i - 1] && value > profile[i + 1] && value > max * 0.38) {
      peaks.push({ radius: i / profile.length, strength: value / max });
    }
  }

  return peaks.sort((a, b) => b.strength - a.strength);
}

function estimateVoidRadius(profile) {
  const max = Math.max(...profile, 0.0001);
  const threshold = max * 0.24;
  for (let i = 0; i < profile.length; i += 1) {
    if (profile[i] > threshold) return i / profile.length;
  }
  return 0.18;
}

function estimateContrast(profile) {
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  return clamp01((max - min) * 1.8);
}

function samplePalette(pixels) {
  let r = 0;
  let g = 0;
  let b = 0;
  let weightSum = 0;

  for (let y = 0; y < ANALYSIS_SIZE; y += 3) {
    for (let x = 0; x < ANALYSIS_SIZE; x += 3) {
      const index = (y * ANALYSIS_SIZE + x) * 4;
      const rr = pixels[index];
      const gg = pixels[index + 1];
      const bb = pixels[index + 2];
      const weight = signalAt(pixels, x, y) + 0.05;
      r += rr * weight;
      g += gg * weight;
      b += bb * weight;
      weightSum += weight;
    }
  }

  return {
    r: Math.round(r / weightSum),
    g: Math.round(g / weightSum),
    b: Math.round(b / weightSum)
  };
}

function signalAt(pixels, x, y) {
  const index = (y * ANALYSIS_SIZE + x) * 4;
  const r = pixels[index] / 255;
  const g = pixels[index + 1] / 255;
  const b = pixels[index + 2] / 255;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max - min;
  return clamp01((1 - luma) * 0.22 + luma * 0.36 + saturation * 0.72 + max * 0.34);
}

function getLuma(pixels, x, y) {
  const index = (y * ANALYSIS_SIZE + x) * 4;
  return 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function round(value) {
  return Number(value.toFixed(3));
}
