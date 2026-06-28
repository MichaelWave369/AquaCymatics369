export default function SessionPanel({
  sessions,
  onSaveSession,
  onLoadSession,
  onDeleteSession,
  onSnapshot,
  snapshotStatus
}) {
  return (
    <section className="session-card" aria-label="Session tools">
      <div className="session-header">
        <div>
          <p className="ledger-title">v0.3.1 capture lane</p>
          <h3>Sessions & exports</h3>
        </div>
      </div>

      <div className="session-actions">
        <button onClick={onSnapshot}>Export PNG</button>
        <button onClick={onSaveSession}>Save session</button>
      </div>

      {snapshotStatus && <p className="session-status">{snapshotStatus}</p>}

      <div className="session-list">
        {sessions.length === 0 ? (
          <p className="subtle">No saved sessions yet. Save a field state to recall it later from this browser.</p>
        ) : (
          sessions.map((session) => (
            <article className="session-item" key={session.id}>
              <div>
                <strong>{session.name}</strong>
                <span>{formatDate(session.createdAt)}</span>
              </div>
              <div className="session-item-actions">
                <button onClick={() => onLoadSession(session)}>Load</button>
                <button onClick={() => onDeleteSession(session.id)}>Delete</button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return 'saved session';
  }
}
