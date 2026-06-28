const STORAGE_KEY = 'aquacymatics369.sessions.v1';
const MAX_SESSIONS = 12;

export function listSessions() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session) {
  const current = listSessions();
  const next = [session, ...current.filter((item) => item.id !== session.id)].slice(0, MAX_SESSIONS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSession(id) {
  const next = listSessions().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function makeSessionSnapshot({ controls, reconstruction, audio }) {
  const safeReconstruction = reconstruction
    ? {
        ...reconstruction,
        dataUrl: shouldKeepDataUrl(reconstruction.dataUrl) ? reconstruction.dataUrl : null
      }
    : null;

  return {
    id: `session-${Date.now()}`,
    name: makeSessionName(controls, reconstruction),
    createdAt: new Date().toISOString(),
    controls,
    reconstruction: safeReconstruction,
    audio
  };
}

export function downloadCanvasSnapshot(selector = '.visualizer-canvas') {
  const canvas = document.querySelector(selector);
  if (!canvas || typeof canvas.toDataURL !== 'function') {
    return { ok: false, message: 'No canvas available yet.' };
  }

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `aquacymatics369-snapshot-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { ok: true, message: 'PNG snapshot exported.' };
  } catch {
    return { ok: false, message: 'Snapshot blocked by the browser.' };
  }
}

function makeSessionName(controls, reconstruction) {
  const source = reconstruction ? 'image' : 'oscillator';
  const hz = Math.round(controls.frequency ?? 432);
  const symmetry = Math.round(controls.symmetry ?? 12);
  return `${hz} Hz • ${symmetry}-sector • ${source}`;
}

function shouldKeepDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.length > 0 && dataUrl.length < 850000;
}
