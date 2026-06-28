export default function SpectrumPanel({ spectrum, peakHz, frequency, audioState, sweepRunning, harmonicMix }) {
  const bars = spectrum?.length ? spectrum : Array.from({ length: 48 }, () => 0);
  const status = sweepRunning ? 'sweeping' : audioState === 'playing' ? 'oscillator live' : 'standby';

  return (
    <section className="spectrum-card" aria-label="Audio spectrum analysis">
      <div className="spectrum-header">
        <div>
          <p className="ledger-title">v0.3 audio lab</p>
          <h3>Spectrum monitor</h3>
        </div>
        <span className={`status-pill ${sweepRunning || audioState === 'playing' ? 'active' : ''}`}>{status}</span>
      </div>

      <div className="spectrum-bars" aria-label="Frequency spectrum bars">
        {bars.map((value, index) => (
          <i key={index} style={{ transform: `scaleY(${Math.max(0.035, Math.min(1, value))})` }} />
        ))}
      </div>

      <dl className="spectrum-stats">
        <div>
          <dt>Target</dt>
          <dd>{Math.round(frequency)} Hz</dd>
        </div>
        <div>
          <dt>Peak</dt>
          <dd>{peakHz > 0 ? `${Math.round(peakHz)} Hz` : '—'}</dd>
        </div>
        <div>
          <dt>Harmonics</dt>
          <dd>{Math.round(harmonicMix * 100)}%</dd>
        </div>
      </dl>
    </section>
  );
}
